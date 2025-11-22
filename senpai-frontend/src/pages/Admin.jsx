import React, { useEffect, useState } from "react";
import "../styles/admin.css";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import userAvatar from "../assets/user-avatar.jpg";

export default function Admin() {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState("members");
    
    // Members state
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersPage, setMembersPage] = useState(0);
    const [membersTotalPages, setMembersTotalPages] = useState(0);
    const [membersTotalElements, setMembersTotalElements] = useState(0);
    const [memberFilters, setMemberFilters] = useState({
        username: "",
        email: "",
        active: null,
        role: "",
        registeredOn: ""
    });
    
    // Comments state
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsPage, setCommentsPage] = useState(0);
    const [commentsTotalPages, setCommentsTotalPages] = useState(0);
    const [commentsTotalElements, setCommentsTotalElements] = useState(0);
    const [commentFilters, setCommentFilters] = useState({
        commentId: "",
        content: "",
        username: "",
        episodeId: "",
        animeTitle: "",
        createdOn: "",
        updatedOn: ""
    });

    // Inline editing state for members - whole row editing
    const [editingMemberId, setEditingMemberId] = useState(null);
    const [memberEditValues, setMemberEditValues] = useState({});
    const [memberPfpFile, setMemberPfpFile] = useState(null);
    const [memberPfpPreview, setMemberPfpPreview] = useState(null);
    const [memberPfpUploading, setMemberPfpUploading] = useState(null);
    const [memberPfpError, setMemberPfpError] = useState(null);
    const [memberError, setMemberError] = useState(null);

    // Inline editing state for comments - whole row editing
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [commentEditValue, setCommentEditValue] = useState("");
    const [commentError, setCommentError] = useState(null);

    // Check if user is admin
    useEffect(() => {
        if (authUser?.role !== "ADMIN") {
            navigate("/");
        }
    }, [authUser, navigate]);

    // Load Members
    useEffect(() => {
        if (activeTab !== "members") return;
        
        async function loadMembers() {
            setMembersLoading(true);
            try {
                const params = new URLSearchParams();
                const hasFilters = memberFilters.username || memberFilters.email || 
                                 memberFilters.active !== null || memberFilters.role || 
                                 memberFilters.registeredOn;

                if (hasFilters) {
                    // Use filter endpoint
                    if (memberFilters.username) params.append("username", memberFilters.username);
                    if (memberFilters.email) params.append("email", memberFilters.email);
                    if (memberFilters.active !== null) params.append("active", memberFilters.active);
                    if (memberFilters.role) params.append("role", memberFilters.role);
                    if (memberFilters.registeredOn) params.append("registeredOn", memberFilters.registeredOn);

                    const url = `http://localhost:8080/api/v1/admin/member/filter?${params}`;
                    const res = await authFetch(url);
                    
                    if (res.ok) {
                        const text = await res.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                let membersList = [];
                                if (Array.isArray(data)) {
                                    membersList = data;
                                } else if (Array.isArray(data?.members)) {
                                    membersList = data.members;
                                }
                                setMembers(membersList);
                                setMembersTotalPages(0);
                                setMembersTotalElements(membersList.length);
                            } catch (parseError) {
                                console.error("Error parsing members JSON:", parseError);
                                setMembers([]);
                                setMembersTotalElements(0);
                            }
                        } else {
                            setMembers([]);
                            setMembersTotalElements(0);
                        }
                    }
                } else {
                    // Use paginated endpoint
                    params.append("page", membersPage.toString());
                    params.append("size", "15");
                    
                    const url = `http://localhost:8080/api/v1/admin/members?${params}`;
                    const res = await authFetch(url);
                    
                    if (res.ok) {
                        const text = await res.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                // Handle both response structures
                                let membersList = [];
                                if (Array.isArray(data.members)) {
                                    membersList = data.members;
                                    setMembersTotalPages(data.totalPages || 0);
                                    setMembersTotalElements(data.totalElements || membersList.length);
                                } else if (Array.isArray(data.content)) {
                                    membersList = data.content;
                                    setMembersTotalPages(data.totalPages || 0);
                                    setMembersTotalElements(data.totalElements || membersList.length);
                                } else if (Array.isArray(data)) {
                                    membersList = data;
                                    setMembersTotalPages(0);
                                    setMembersTotalElements(data.length);
                                }
                                
                                // Log first member to check structure
                                if (membersList.length > 0) {
                                    console.log("First member loaded:", membersList[0]);
                                    console.log("First member ID:", membersList[0].id);
                                }
                                
                                setMembers(membersList);
                            } catch (parseError) {
                                console.error("Error parsing members JSON:", parseError);
                                console.error("Response text:", text);
                                setMembers([]);
                            }
                        } else {
                            setMembers([]);
                        }
                    } else {
                        const errorText = await res.text();
                        console.error("Error response:", res.status, errorText);
                        setMembers([]);
                    }
                }
            } catch (error) {
                console.error("Error loading members:", error);
                setMembers([]);
            } finally {
                setMembersLoading(false);
            }
        }

        loadMembers();
    }, [activeTab, memberFilters, membersPage]);

    // Load Comments
    useEffect(() => {
        if (activeTab !== "comments") return;
        
        async function loadComments() {
            setCommentsLoading(true);
            try {
                const params = new URLSearchParams();
                const hasFilters = commentFilters.commentId || commentFilters.content || 
                                 commentFilters.username || commentFilters.episodeId || 
                                 commentFilters.animeTitle || commentFilters.createdOn || 
                                 commentFilters.updatedOn;

                if (hasFilters) {
                    // Use filter endpoint
                    if (commentFilters.commentId) params.append("commentId", commentFilters.commentId);
                    if (commentFilters.content) params.append("content", commentFilters.content);
                    if (commentFilters.username) params.append("username", commentFilters.username);
                    if (commentFilters.episodeId) params.append("episodeId", commentFilters.episodeId);
                    if (commentFilters.animeTitle) params.append("animeTitle", commentFilters.animeTitle);
                    if (commentFilters.createdOn) params.append("createdOn", commentFilters.createdOn);
                    if (commentFilters.updatedOn) params.append("updatedOn", commentFilters.updatedOn);

                    const url = `http://localhost:8080/api/v1/admin/comment/filter?${params}`;
                    const res = await authFetch(url);
                    
                    if (res.ok) {
                        const text = await res.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                let commentsList = [];
                                if (Array.isArray(data)) {
                                    commentsList = data;
                                } else if (Array.isArray(data.comments)) {
                                    commentsList = data.comments;
                                }
                                setComments(commentsList);
                                setCommentsTotalPages(0);
                                setCommentsTotalElements(commentsList.length);
                            } catch (parseError) {
                                console.error("Error parsing comments JSON:", parseError);
                                setComments([]);
                                setCommentsTotalElements(0);
                            }
                        } else {
                            setComments([]);
                            setCommentsTotalElements(0);
                        }
                    }
                } else {
                    // Use paginated endpoint
                    params.append("page", commentsPage.toString());
                    params.append("size", "15");
                    
                    const url = `http://localhost:8080/api/v1/admin/comments?${params}`;
                    const res = await authFetch(url);
                    
                    if (res.ok) {
                        const text = await res.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                // Handle both response structures
                                let commentsList = [];
                                if (Array.isArray(data.comments)) {
                                    commentsList = data.comments;
                                    setCommentsTotalPages(data.totalPages || 0);
                                    setCommentsTotalElements(data.totalElements || commentsList.length);
                                } else if (Array.isArray(data.content)) {
                                    commentsList = data.content;
                                    setCommentsTotalPages(data.totalPages || 0);
                                    setCommentsTotalElements(data.totalElements || commentsList.length);
                                } else if (Array.isArray(data)) {
                                    commentsList = data;
                                    setCommentsTotalPages(0);
                                    setCommentsTotalElements(data.length);
                                }
                                setComments(commentsList);
                            } catch (parseError) {
                                console.error("Error parsing comments JSON:", parseError);
                                console.error("Response text:", text);
                                setComments([]);
                                setCommentsTotalElements(0);
                            }
                        } else {
                            setComments([]);
                            setCommentsTotalElements(0);
                        }
                    } else {
                        const errorText = await res.text();
                        console.error("Error response:", res.status, errorText);
                        setComments([]);
                        setCommentsTotalElements(0);
                    }
                }
            } catch (error) {
                console.error("Error loading comments:", error);
                setComments([]);
            } finally {
                setCommentsLoading(false);
            }
        }

        loadComments();
    }, [activeTab, commentFilters, commentsPage]);

    function handleMemberFilterChange(key, value) {
        setMemberFilters(prev => ({ ...prev, [key]: value }));
        setMembersPage(0); // Reset to first page when filtering
    }

    function handleCommentFilterChange(key, value) {
        setCommentFilters(prev => ({ ...prev, [key]: value }));
        setCommentsPage(0); // Reset to first page when filtering
    }

    function resetMemberFilters() {
        setMemberFilters({
            username: "",
            email: "",
            active: null,
            role: "",
            registeredOn: ""
        });
        setMembersPage(0);
    }

    function resetCommentFilters() {
        setCommentFilters({
            commentId: "",
            content: "",
            username: "",
            episodeId: "",
            animeTitle: "",
            createdOn: "",
            updatedOn: ""
        });
        setCommentsPage(0);
    }

    // Start editing a member row (clicking any field activates edit mode for whole row)
    function startEditingMember(member) {
        setEditingMemberId(member.id);
        setMemberEditValues({
            username: member.username || "",
            email: member.email || "",
            active: member.active !== undefined ? member.active : true,
            role: member.role || "USER"
        });
        setMemberPfpFile(null);
        setMemberPfpPreview(null);
        setMemberPfpError(null);
        setMemberError(null);
    }

    // Cancel editing member
    function cancelEditingMember() {
        setEditingMemberId(null);
        setMemberEditValues({});
        setMemberPfpFile(null);
        setMemberPfpPreview(null);
        setMemberPfpError(null);
        setMemberError(null);
    }

    // Save member changes (all fields at once)
    async function saveMemberChanges(memberId) {
        if (!memberId) {
            throw new Error("Member ID е задължителен");
        }

        // Ensure memberId is a string
        const idString = typeof memberId === 'string' ? memberId : memberId.toString();
        
        if (!idString || idString === 'undefined' || idString === 'null') {
            throw new Error("Невалиден Member ID");
        }

        try {
            // Build update DTO with ALL fields from the row
            const updateDto = {
                id: idString
            };

            // Always include all fields (even if not changed) to ensure complete update
            // Only include fields that have actual values
            if (memberEditValues.username !== undefined && memberEditValues.username !== "") {
                updateDto.username = memberEditValues.username;
            }
            if (memberEditValues.email !== undefined && memberEditValues.email !== "") {
                updateDto.email = memberEditValues.email;
            }
            if (memberEditValues.active !== undefined) {
                updateDto.active = memberEditValues.active;
            }
            if (memberEditValues.role !== undefined && memberEditValues.role !== "") {
                updateDto.role = memberEditValues.role;
            }

            console.log("Sending update DTO:", updateDto);

            const res = await authFetch("http://localhost:8080/api/v1/admin/member", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateDto)
            });

            if (res.ok) {
                // Success - reload will be handled by saveMemberRow
                return;
            } else {
                const errorText = await res.text();
                console.error("Error updating member:", res.status, errorText);
                throw new Error(errorText || "Грешка при обновяване на член");
            }
        } catch (error) {
            console.error("Error saving member changes:", error);
            throw error; // Re-throw to be caught by saveMemberRow
        }
    }

    // Handle profile picture selection
    function handleMemberPfpSelect(e, memberId) {
        const file = e.target.files[0];
        if (file) {
            setMemberPfpFile({ memberId, file });
            setMemberPfpPreview({ memberId, preview: URL.createObjectURL(file) });
            setMemberPfpError(null);
        }
    }

    // Save member row - ALL changes at once (profile picture + all other fields)
    async function saveMemberRow(memberId) {
        // Validate memberId
        if (!memberId) {
            setMemberError("Грешка: Липсва ID на член");
            return;
        }

        // Convert to string if it's not already
        const idString = typeof memberId === 'string' ? memberId : memberId.toString();
        
        if (!idString || idString === 'undefined' || idString === 'null') {
            setMemberError("Грешка: Невалиден ID на член");
            return;
        }

        setMemberError(null);
        setMemberPfpError(null);
        try {
            const promises = [];

            // 1. Upload profile picture if selected
            if (memberPfpFile && memberPfpFile.memberId === memberId) {
                promises.push(uploadMemberPfp(memberId));
            }
            
            // 2. Save all other field changes (username, email, role, active)
            // Note: saveMemberChanges doesn't reload members anymore, we do it here
            promises.push(saveMemberChanges(idString));

            // Wait for ALL changes to complete at once
            await Promise.all(promises);
            
            // Reload members after all changes are saved
            const params = new URLSearchParams();
            const hasFilters = memberFilters.username || memberFilters.email || 
                             memberFilters.active !== null || memberFilters.role || 
                             memberFilters.registeredOn;

            if (hasFilters) {
                if (memberFilters.username) params.append("username", memberFilters.username);
                if (memberFilters.email) params.append("email", memberFilters.email);
                if (memberFilters.active !== null) params.append("active", memberFilters.active);
                if (memberFilters.role) params.append("role", memberFilters.role);
                if (memberFilters.registeredOn) params.append("registeredOn", memberFilters.registeredOn);

                const url = `http://localhost:8080/api/v1/admin/member/filter?${params}`;
                const res = await authFetch(url);
                if (res.ok) {
                    const text = await res.text();
                    if (text.trim()) {
                        const data = JSON.parse(text);
                        let membersList = [];
                        if (Array.isArray(data)) {
                            membersList = data;
                        } else if (Array.isArray(data.members)) {
                            membersList = data.members;
                        }
                        setMembers(membersList);
                        setMembersTotalPages(0);
                        setMembersTotalElements(membersList.length);
                    }
                }
            } else {
                params.append("page", membersPage.toString());
                params.append("size", "15");
                const url = `http://localhost:8080/api/v1/admin/members?${params}`;
                const res = await authFetch(url);
                if (res.ok) {
                    const text = await res.text();
                    if (text.trim()) {
                        const data = JSON.parse(text);
                        let membersList = [];
                        if (Array.isArray(data.members)) {
                            membersList = data.members;
                            setMembersTotalPages(data.totalPages || 0);
                            setMembersTotalElements(data.totalElements || membersList.length);
                        } else if (Array.isArray(data.content)) {
                            membersList = data.content;
                            setMembersTotalPages(data.totalPages || 0);
                            setMembersTotalElements(data.totalElements || membersList.length);
                        } else if (Array.isArray(data)) {
                            membersList = data;
                            setMembersTotalPages(0);
                            setMembersTotalElements(data.length);
                        }
                        setMembers(membersList);
                    }
                }
            }

            cancelEditingMember();
        } catch (error) {
            console.error("Error saving member row:", error);
            const errorMessage = error.message || "Грешка при запазване на промените";
            if (error.isPfpError) {
                setMemberPfpError(errorMessage);
            } else {
                setMemberError(errorMessage);
            }
        }
    }

    // Upload profile picture
    async function uploadMemberPfp(memberId) {
        const pfpData = memberPfpFile;
        if (!pfpData || pfpData.memberId !== memberId) return;

        setMemberPfpUploading(memberId);
        setMemberPfpError(null);
        try {
            // First, delete old picture if exists
            const member = members.find(m => m.id === memberId);
            if (member?.profilePictureUrl) {
                // Extract image name from URL
                // URL format: http://localhost:8080/profile-pictures/{memberId}_{originalFilename}
                const urlParts = member.profilePictureUrl.split('/');
                const fullFileName = urlParts[urlParts.length - 1];
                
                if (fullFileName) {
                    try {
                        // Extract just the imageName part (without memberId prefix)
                        // File format: {memberId}_{originalFilename}
                        // We need to extract {originalFilename} part
                        const fileNameWithoutPrefix = fullFileName.startsWith(memberId + "_") 
                            ? fullFileName.substring(memberId.toString().length + 1) 
                            : fullFileName;

                        // Use admin endpoint to delete
                        const deleteRes = await authFetch(
                            `http://localhost:8080/api/v1/admin/profilePicture/${memberId}/${fileNameWithoutPrefix}`,
                            {
                                method: "DELETE"
                            }
                        );

                        // If delete fails, log but continue with upload
                        if (!deleteRes.ok) {
                            console.warn("Could not delete old picture, continuing with upload");
                        }
                    } catch (deleteError) {
                        console.warn("Error deleting old picture:", deleteError);
                        // Continue with upload even if delete fails
                    }
                }
            }

            const formData = new FormData();
            formData.append("file", pfpData.file);

            // Use admin endpoint to upload
            const res = await authFetch(
                `http://localhost:8080/api/v1/admin/profilePicture/${memberId}`,
                {
                    method: "POST",
                    body: formData
                }
            );

            if (res.ok) {
                // Picture uploaded successfully
                // Members will be reloaded by saveMemberRow after all changes are saved
                setMemberPfpFile(null);
                setMemberPfpPreview(null);
                setMemberPfpUploading(null);
                setMemberPfpError(null);
            } else {
                const errorText = await res.text();
                console.error("Error uploading picture:", errorText);
                setMemberPfpUploading(null);
                let message = errorText;
                try {
                    const parsed = JSON.parse(errorText);
                    message = parsed.message || parsed.error || message;
                } catch {
                    // ignore JSON parse errors
                }
                const uploadError = new Error(message || "Грешка при качване на снимката");
                uploadError.isPfpError = true;
                throw uploadError;
            }
        } catch (error) {
            console.error("Error uploading member picture:", error);
            setMemberPfpUploading(null);
            if (!error.isPfpError) {
                error.isPfpError = true;
            }
            throw error; // Re-throw to be caught by Promise.all
        }
    }

    // Start editing comment row
    function startEditingComment(comment) {
        setEditingCommentId(comment.id);
        setCommentEditValue(comment.content || "");
        setCommentError(null);
    }

    // Cancel editing comment
    function cancelEditingComment() {
        setEditingCommentId(null);
        setCommentEditValue("");
        setCommentError(null);
    }

    // Save comment changes (whole row)
    async function saveCommentChanges(commentId) {
        if (!commentId) {
            setCommentError("Грешка: Липсва ID на коментар");
            return;
        }

        setCommentError(null);
        try {
            const updateDto = {
                commentId: commentId,
                content: commentEditValue
            };

            const res = await authFetch("http://localhost:8080/api/v1/admin/comment", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateDto)
            });

            if (res.ok) {
                // Reload comments
                const params = new URLSearchParams();
                const hasFilters = commentFilters.commentId || commentFilters.content || 
                                 commentFilters.username || commentFilters.episodeId || 
                                 commentFilters.animeTitle || commentFilters.createdOn || 
                                 commentFilters.updatedOn;

                if (hasFilters) {
                    if (commentFilters.commentId) params.append("commentId", commentFilters.commentId);
                    if (commentFilters.content) params.append("content", commentFilters.content);
                    if (commentFilters.username) params.append("username", commentFilters.username);
                    if (commentFilters.episodeId) params.append("episodeId", commentFilters.episodeId);
                    if (commentFilters.animeTitle) params.append("animeTitle", commentFilters.animeTitle);
                    if (commentFilters.createdOn) params.append("createdOn", commentFilters.createdOn);
                    if (commentFilters.updatedOn) params.append("updatedOn", commentFilters.updatedOn);

                    const url = `http://localhost:8080/api/v1/admin/comment/filter?${params}`;
                    const res2 = await authFetch(url);
                    if (res2.ok) {
                        const text = await res2.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                let commentsList = [];
                                if (Array.isArray(data)) {
                                    commentsList = data;
                                } else if (Array.isArray(data.comments)) {
                                    commentsList = data.comments;
                                }
                                setComments(commentsList);
                                setCommentsTotalPages(0);
                                setCommentsTotalElements(commentsList.length);
                            } catch (parseError) {
                                console.error("Error parsing comments JSON:", parseError);
                                setComments([]);
                                setCommentsTotalElements(0);
                            }
                        } else {
                            setComments([]);
                            setCommentsTotalElements(0);
                        }
                    }
                } else {
                    params.append("page", commentsPage.toString());
                    params.append("size", "15");
                    const url = `http://localhost:8080/api/v1/admin/comments?${params}`;
                    const res2 = await authFetch(url);
                    if (res2.ok) {
                        const text = await res2.text();
                        if (text.trim()) {
                            try {
                                const data = JSON.parse(text);
                                let commentsList = [];
                                if (Array.isArray(data.comments)) {
                                    commentsList = data.comments;
                                    setCommentsTotalPages(data.totalPages || 0);
                                    setCommentsTotalElements(data.totalElements || commentsList.length);
                                } else if (Array.isArray(data.content)) {
                                    commentsList = data.content;
                                    setCommentsTotalPages(data.totalPages || 0);
                                    setCommentsTotalElements(data.totalElements || commentsList.length);
                                } else if (Array.isArray(data)) {
                                    commentsList = data;
                                    setCommentsTotalPages(0);
                                    setCommentsTotalElements(data.length);
                                }
                                setComments(commentsList);
                            } catch (parseError) {
                                console.error("Error parsing comments JSON:", parseError);
                                setComments([]);
                                setCommentsTotalElements(0);
                            }
                        } else {
                            setComments([]);
                            setCommentsTotalElements(0);
                        }
                    }
                }
                
                cancelEditingComment();
            } else {
                const errorText = await res.text();
                console.error("Error updating comment:", errorText);
                throw new Error(errorText || "Грешка при обновяване на коментар");
            }
        } catch (error) {
            console.error("Error saving comment changes:", error);
            const errorMessage = error.message || "Грешка при запазване на промените";
            setCommentError(errorMessage);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleString("bg-BG");
        } catch {
            return dateString;
        }
    }

    if (authUser?.role !== "ADMIN") {
        return null;
    }

    return (
        <div className="admin-page">
            <div className="admin-container">
                <h1 className="admin-title">Админ Панел</h1>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === "members" ? "active" : ""}`}
                        onClick={() => setActiveTab("members")}
                    >
                        Членове
                    </button>
                    <button
                        className={`admin-tab ${activeTab === "comments" ? "active" : ""}`}
                        onClick={() => setActiveTab("comments")}
                    >
                        Коментари
                    </button>
                </div>

                {/* Members Tab */}
                {activeTab === "members" && (
                    <div className="admin-section">
                        <div className="admin-filters">
                            <h3>Филтри</h3>
                            <div className="filter-grid">
                                <div className="filter-item">
                                    <label>Потребителско име</label>
                                    <input
                                        type="text"
                                        value={memberFilters.username}
                                        onChange={(e) => handleMemberFilterChange("username", e.target.value)}
                                        placeholder="Търси по име..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Имейл</label>
                                    <input
                                        type="text"
                                        value={memberFilters.email}
                                        onChange={(e) => handleMemberFilterChange("email", e.target.value)}
                                        placeholder="Търси по имейл..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Роля</label>
                                    <select
                                        value={memberFilters.role}
                                        onChange={(e) => handleMemberFilterChange("role", e.target.value)}
                                    >
                                        <option value="">Всички</option>
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Активен</label>
                                    <select
                                        value={memberFilters.active === null ? "" : memberFilters.active.toString()}
                                        onChange={(e) => handleMemberFilterChange("active", e.target.value === "" ? null : e.target.value === "true")}
                                    >
                                        <option value="">Всички</option>
                                        <option value="true">Активен</option>
                                        <option value="false">Неактивен</option>
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Регистриран на</label>
                                    <input
                                        type="datetime-local"
                                        value={memberFilters.registeredOn}
                                        onChange={(e) => handleMemberFilterChange("registeredOn", e.target.value)}
                                    />
                                </div>
                            </div>
                            <button className="reset-filters-btn" onClick={resetMemberFilters}>
                                Изчисти филтри
                            </button>
                        </div>

                        <div className="admin-table-container">
                            {membersLoading ? (
                                <div className="loading-spinner">Зареждане...</div>
                            ) : (
                                <>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Снимка</th>
                                                <th>Потребителско име</th>
                                                <th>Имейл</th>
                                                <th>Роля</th>
                                                <th>Активен</th>
                                                <th>Регистриран на</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="no-data">Няма данни</td>
                                                </tr>
                                            ) : (
                                                members.map((member) => (
                                                    <React.Fragment key={member.id}>
                                                        <tr 
                                                            className={editingMemberId === member.id ? "row-editing" : ""}
                                                        >
                                                            <td className="id-cell">{member.id?.toString().substring(0, 8)}...</td>
                                                            <td>
                                                                <div className="member-pfp-cell">
                                                                    <img
                                                                        src={member.profilePictureUrl || userAvatar}
                                                                        alt={member.username}
                                                                        className="member-pfp"
                                                                    />
                                                                    {editingMemberId === member.id && (
                                                                        <div className="pfp-edit-controls">
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={(e) => handleMemberPfpSelect(e, member.id)}
                                                                                className="pfp-file-input"
                                                                            />
                                                                            {memberPfpPreview?.memberId === member.id && memberPfpPreview?.preview && (
                                                                                <img
                                                                                    src={memberPfpPreview.preview}
                                                                                    alt="preview"
                                                                                    className="pfp-preview"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {editingMemberId === member.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={memberEditValues.username}
                                                                        onChange={(e) => setMemberEditValues({ ...memberEditValues, username: e.target.value })}
                                                                        className="edit-input"
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="editable-field"
                                                                        onClick={() => startEditingMember(member)}
                                                                        title="Кликни за редактиране"
                                                                    >
                                                                        {member.username}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {editingMemberId === member.id ? (
                                                                    <input
                                                                        type="email"
                                                                        value={memberEditValues.email}
                                                                        onChange={(e) => setMemberEditValues({ ...memberEditValues, email: e.target.value })}
                                                                        className="edit-input"
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="editable-field"
                                                                        onClick={() => startEditingMember(member)}
                                                                        title="Кликни за редактиране"
                                                                    >
                                                                        {member.email}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {editingMemberId === member.id ? (
                                                                    <select
                                                                        value={memberEditValues.role}
                                                                        onChange={(e) => setMemberEditValues({ ...memberEditValues, role: e.target.value })}
                                                                        className="edit-input"
                                                                    >
                                                                        <option value="USER">USER</option>
                                                                        <option value="ADMIN">ADMIN</option>
                                                                    </select>
                                                                ) : (
                                                                    <span
                                                                        className="editable-field"
                                                                        onClick={() => startEditingMember(member)}
                                                                        title="Кликни за редактиране"
                                                                    >
                                                                        <span className={`role-badge ${member.role?.toLowerCase()}`}>
                                                                            {member.role}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {editingMemberId === member.id ? (
                                                                    <select
                                                                        value={memberEditValues.active ? "true" : "false"}
                                                                        onChange={(e) => setMemberEditValues({ ...memberEditValues, active: e.target.value === "true" })}
                                                                        className="edit-input"
                                                                    >
                                                                        <option value="true">Активен</option>
                                                                        <option value="false">Неактивен</option>
                                                                    </select>
                                                                ) : (
                                                                    <span
                                                                        className="editable-field"
                                                                        onClick={() => startEditingMember(member)}
                                                                        title="Кликни за редактиране"
                                                                    >
                                                                        <span className={`status-badge ${member.active ? "active" : "inactive"}`}>
                                                                            {member.active ? "✓" : "✗"}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>{formatDate(member.registeredOn)}</td>
                                                        </tr>
                                                        {editingMemberId === member.id && (
                                                            <tr className="row-submit-row">
                                                                <td colSpan="7">
                                                                    <div className="row-submit-controls">
                                                                        <div className="row-submit-buttons">
                                                                            <button
                                                                                className="edit-submit-btn"
                                                                                onClick={() => {
                                                                                    console.log("Saving member row, member.id:", member.id, "member:", member);
                                                                                    if (!member.id) {
                                                                                        setMemberError("Грешка: Липсва ID на член в данните");
                                                                                        return;
                                                                                    }
                                                                                    saveMemberRow(member.id);
                                                                                }}
                                                                                disabled={memberPfpUploading === member.id}
                                                                            >
                                                                                {memberPfpUploading === member.id ? "Запазване..." : "Направи промяната"}
                                                                            </button>
                                                                            <button
                                                                                className="edit-cancel-btn"
                                                                                onClick={cancelEditingMember}
                                                                            >
                                                                                Отказ
                                                                            </button>
                                                                        </div>
                                                                        {memberError && (
                                                                            <div className="admin-error-message">
                                                                                <span className="error-icon">⚠️</span>
                                                                                <span>{memberError}</span>
                                                                            </div>
                                                                        )}
                                                                        {memberPfpError && (
                                                                            <div className="admin-error-message">
                                                                                <span className="error-icon">⚠️</span>
                                                                                <span>{memberPfpError}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {!memberFilters.username && !memberFilters.email && memberFilters.active === null && !memberFilters.role && !memberFilters.registeredOn && (
                                        <div className="pagination-controls">
                                            <button
                                                onClick={() => setMembersPage(prev => Math.max(0, prev - 1))}
                                                disabled={membersPage === 0}
                                                className="pagination-btn"
                                            >
                                                Предишна
                                            </button>
                                            <span className="pagination-info">
                                                Страница {membersPage + 1} от {membersTotalPages || 1} ({membersTotalElements} общо)
                                            </span>
                                            <button
                                                onClick={() => setMembersPage(prev => prev + 1)}
                                                disabled={membersPage >= membersTotalPages - 1}
                                                className="pagination-btn"
                                            >
                                                Следваща
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Comments Tab */}
                {activeTab === "comments" && (
                    <div className="admin-section">
                        <div className="admin-filters">
                            <h3>Филтри</h3>
                            <div className="filter-grid">
                                <div className="filter-item">
                                    <label>ID на коментар</label>
                                    <input
                                        type="text"
                                        value={commentFilters.commentId}
                                        onChange={(e) => handleCommentFilterChange("commentId", e.target.value)}
                                        placeholder="UUID..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Съдържание</label>
                                    <input
                                        type="text"
                                        value={commentFilters.content}
                                        onChange={(e) => handleCommentFilterChange("content", e.target.value)}
                                        placeholder="Търси в съдържанието..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Потребител</label>
                                    <input
                                        type="text"
                                        value={commentFilters.username}
                                        onChange={(e) => handleCommentFilterChange("username", e.target.value)}
                                        placeholder="Потребителско име..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>ID на епизод</label>
                                    <input
                                        type="text"
                                        value={commentFilters.episodeId}
                                        onChange={(e) => handleCommentFilterChange("episodeId", e.target.value)}
                                        placeholder="Episode ID..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Заглавие на аниме</label>
                                    <input
                                        type="text"
                                        value={commentFilters.animeTitle}
                                        onChange={(e) => handleCommentFilterChange("animeTitle", e.target.value)}
                                        placeholder="Заглавие на аниме..."
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Създаден на</label>
                                    <input
                                        type="datetime-local"
                                        value={commentFilters.createdOn}
                                        onChange={(e) => handleCommentFilterChange("createdOn", e.target.value)}
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Обновен на</label>
                                    <input
                                        type="datetime-local"
                                        value={commentFilters.updatedOn}
                                        onChange={(e) => handleCommentFilterChange("updatedOn", e.target.value)}
                                    />
                                </div>
                            </div>
                            <button className="reset-filters-btn" onClick={resetCommentFilters}>
                                Изчисти филтри
                            </button>
                        </div>

                        <div className="admin-table-container">
                            {commentsLoading ? (
                                <div className="loading-spinner">Зареждане...</div>
                            ) : (
                                <>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Съдържание</th>
                                                <th>Аниме</th>
                                                <th>Епизод</th>
                                                <th>Потребител</th>
                                                <th>Създаден на</th>
                                                <th>Обновен на</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comments.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="no-data">Няма данни</td>
                                                </tr>
                                            ) : (
                                                comments.map((comment) => (
                                                    <React.Fragment key={comment.id}>
                                                        <tr 
                                                            className={editingCommentId === comment.id ? "row-editing" : ""}
                                                        >
                                                            <td className="id-cell">{comment.id?.toString().substring(0, 8)}...</td>
                                                            <td className="content-cell">
                                                                {editingCommentId === comment.id ? (
                                                                    <textarea
                                                                        value={commentEditValue}
                                                                        onChange={(e) => setCommentEditValue(e.target.value)}
                                                                        className="edit-input edit-textarea"
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="editable-field content-editable"
                                                                        onClick={() => startEditingComment(comment)}
                                                                        title="Кликни за редактиране"
                                                                    >
                                                                        {comment.content}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>{comment.animeTitle || "N/A"}</td>
                                                            <td>{comment.episodeId || "N/A"}</td>
                                                            <td>{comment.commentCreator?.username || comment.member?.username || "N/A"}</td>
                                                            <td>{formatDate(comment.createdOn)}</td>
                                                            <td>{formatDate(comment.updatedOn) || "N/A"}</td>
                                                        </tr>
                                                        {editingCommentId === comment.id && (
                                                            <tr className="row-submit-row">
                                                                <td colSpan="7">
                                                                    <div className="row-submit-controls">
                                                                        <div className="row-submit-buttons">
                                                                            <button
                                                                                className="edit-submit-btn"
                                                                                onClick={() => saveCommentChanges(comment.id)}
                                                                                disabled={!commentEditValue.trim()}
                                                                            >
                                                                                Направи промяната
                                                                            </button>
                                                                            <button
                                                                                className="edit-cancel-btn"
                                                                                onClick={cancelEditingComment}
                                                                            >
                                                                                Отказ
                                                                            </button>
                                                                        </div>
                                                                        {commentError && (
                                                                            <div className="admin-error-message">
                                                                                <span className="error-icon">⚠️</span>
                                                                                <span>{commentError}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {!commentFilters.commentId && !commentFilters.content && !commentFilters.username && 
                                     !commentFilters.episodeId && !commentFilters.animeTitle && 
                                     !commentFilters.createdOn && !commentFilters.updatedOn && (
                                        <div className="pagination-controls">
                                            <button
                                                onClick={() => setCommentsPage(prev => Math.max(0, prev - 1))}
                                                disabled={commentsPage === 0}
                                                className="pagination-btn"
                                            >
                                                Предишна
                                            </button>
                                            <span className="pagination-info">
                                                Страница {commentsPage + 1} от {commentsTotalPages || 1} ({commentsTotalElements} общо)
                                            </span>
                                            <button
                                                onClick={() => setCommentsPage(prev => prev + 1)}
                                                disabled={commentsPage >= commentsTotalPages - 1}
                                                className="pagination-btn"
                                            >
                                                Следваща
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
