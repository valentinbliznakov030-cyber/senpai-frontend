import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authFetch } from "../utils/authFetch";
import { redirectToServerDown } from "../utils/serverDownRedirect";
import "../styles/plans.css";

export default function Plans() {
    const { user } = useAuth();
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState("");

    useEffect(() => {
        const fetchStatus = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                const resp = await authFetch(
                    `http://localhost:8080/api/v1/subscriptions/${user.id}`
                );

                if (resp.ok) {
                    const data = await resp.json();
                    setSubscriptionStatus(data);
                } else {
                    console.error("Failed to fetch subscription status");
                }
            } catch (error) {
                console.error("Error fetching subscription:", error);
                redirectToServerDown();
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [user?.id]);

    const handleUpgrade = async () => {
        if (!user?.id) return;

        setUpgrading(true);
        setUpgradeMessage("");

        try {
            const resp = await authFetch(
                "http://localhost:8080/api/v1/subscriptions/upgrade",
                {
                    method: "PUT",
                }
            );

            if (resp.ok) {
                setUpgradeMessage("✅ Успешно надградихте към Premium план!");
                
                // Refresh status
                const statusResp = await authFetch(
                    `http://localhost:8080/api/v1/subscriptions/${user.id}`
                );
                if (statusResp.ok) {
                    const data = await statusResp.json();
                    setSubscriptionStatus(data);
                }
            } else {
                setUpgradeMessage("❌ Грешка при надграждане. Моля опитайте отново.");
            }
        } catch (error) {
            console.error("Error upgrading:", error);
            setUpgradeMessage("❌ Грешка при надграждане. Моля опитайте отново.");
        } finally {
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <div className="plans-page">
                <div className="plans-loading">
                    <div className="spinner"></div>
                    <p>Зареждане на плановете...</p>
                </div>
            </div>
        );
    }

    // Default to FREE if no status
    const currentPlan = subscriptionStatus?.planType || "FREE";
    const isPremium = currentPlan === "PREMIUM";
    const isFree = currentPlan === "FREE";
    
    const watchCount = subscriptionStatus?.watchCount || 0;
    const watchLimit = subscriptionStatus?.watchLimit || 4;
    const limitReached = subscriptionStatus?.limitReached || false;
    const remainingWatches = Math.max(0, watchLimit - watchCount);

    return (
        <div className="plans-page">
            <div className="plans-container">
                <h1 className="plans-title">⭐ Планове за Премиум</h1>
                <p className="plans-subtitle">
                    Изберете плана, който най-добре отговаря на вашите нужди
                </p>

                {upgradeMessage && (
                    <div className={`upgrade-message ${upgradeMessage.includes("✅") ? "success" : "error"}`}>
                        {upgradeMessage}
                    </div>
                )}

                <div className="plans-grid">
                    {/* FREE PLAN */}
                    <div className={`plan-card ${isFree ? "active" : "inactive"}`}>
                        {isFree && (
                            <div className="plan-badge">Активен План</div>
                        )}
                        <div className="plan-header">
                            <h2 className="plan-name">FREE</h2>
                            <div className="plan-price">Безплатно</div>
                        </div>
                        <div className="plan-features">
                            <div className="plan-feature">
                                <span className="feature-icon">📺</span>
                                <span>4 гледания с БГ субтитри</span>
                            </div>
                            <div className="plan-feature">
                                <span className="feature-icon">🔄</span>
                                <span>Ресет на всеки 2 седмици</span>
                            </div>
                        </div>
                        {isFree && (
                            <div className="plan-usage">
                                <div className="usage-header">
                                    <span>Оставащи гледания:</span>
                                    <span className={`usage-count ${limitReached ? "limit-reached" : ""}`}>
                                        {remainingWatches} / {watchLimit}
                                    </span>
                                </div>
                                {limitReached ? (
                                    <div className="limit-message">
                                        ⚠️ Достигнахте лимита. Моля изчакайте ресета или надградете към Premium.
                                    </div>
                                ) : (
                                    <div className="usage-bar">
                                        <div 
                                            className="usage-bar-fill"
                                            style={{ width: `${(watchCount / watchLimit) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* PREMIUM PLAN */}
                    <div className={`plan-card ${isPremium ? "active" : "inactive"}`}>
                        {isPremium && (
                            <div className="plan-badge">Активен План</div>
                        )}
                        <div className="plan-header">
                            <h2 className="plan-name">PREMIUM</h2>
                            <div className="plan-price">Доживотно</div>
                        </div>
                        <div className="plan-features">
                            <div className="plan-feature">
                                <span className="feature-icon">♾️</span>
                                <span>Безкраен брой гледания с БГ субтитри</span>
                            </div>
                            <div className="plan-feature">
                                <span className="feature-icon">⭐</span>
                                <span>Приоритетна поддръжка</span>
                            </div>
                            <div className="plan-feature">
                                <span className="feature-icon">🚀</span>
                                <span>Без ограничения</span>
                            </div>
                        </div>
                        {!isPremium && (
                            <button
                                className="upgrade-btn"
                                onClick={handleUpgrade}
                                disabled={upgrading}
                            >
                                {upgrading ? "Надграждане..." : "Надгради към Premium"}
                            </button>
                        )}
                        {isPremium && (
                            <div className="premium-active">
                                <span className="premium-icon">✨</span>
                                <span>Вие сте Premium потребител!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

