import { useState, useEffect } from 'react';
import "../../styles/NotificationCenter.css"
import notificationSVG from "../../assets/notification_svg.svg"
import vibeSVG from "../../assets/heart_fill_svg.svg";
import messageSVG from "../../assets/chat_round-svg.svg"
import echoSVG from "../../assets/echo_svg.svg"
import sadSVG from "../../assets/sad_svg.svg";
import funnySVG from "../../assets/funny_svg.svg";
import emotionalSVG from "../../assets/emotional_svg.svg";
import wholesomeSVG from "../../assets/wholesome_svg.svg";
import toxicSVG from "../../assets/toxic_svg.svg";
import racistSVG from "../../assets/racist_svg.svg";
import relatableSVG from "../../assets/relatable_svg.svg";
import axios from "axios";
import { db } from '../../internalDatabase/db';
import { useNavigate, useLocation } from "react-router-dom";
import CoinIcon from "../Coins/CoinIcon";
import StreakFlame from "../Coins/StreakFlame";
import TransferRequest from "../Coins/TransferRequest";


function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [chatUsernames, setChatUsernames] = useState({});

    const navigate = useNavigate();
    const location = useLocation();
    // Unread notifications before the panel is opened: waiting on the server + saved locally
    const [serverCount, setServerCount] = useState(0);
    const [localUnread, setLocalUnread] = useState(0);

    useEffect(() => {
        if (isOpen) return undefined;
        let active = true;

        const check = async () => {
            if (document.visibilityState !== "visible") return;
            try {
                const local = await db.notifications.toArray();
                if (active) setLocalUnread(local.filter((n) => !n.read).length);
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/user/notification-count`, { withCredentials: true });
                if (active) setServerCount(res.data.count || 0);
            } catch (countErr) {
                // Signed out or offline: keep the last known count
            }
        };

        check();
        const timer = setInterval(check, 60 * 1000);
        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", check);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener("focus", check);
            document.removeEventListener("visibilitychange", check);
        };
    }, [isOpen, location.pathname]);

    const vibeIcons = {
        sad: sadSVG,
        funny: funnySVG,
        emotional: emotionalSVG,
        wholesome: wholesomeSVG,
        toxic: toxicSVG,
        racist: racistSVG,
        relatable: relatableSVG,
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const controller = new AbortController();

        const fetchNotifications = async () => {
            try {
                // Fetch local notifications
                const localNotifications = await db.notifications
                    .orderBy("timestamp")
                    .reverse()
                    .toArray();

                setNotifications(localNotifications);
                await loadChatUsernames(localNotifications);

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/fetch-notifications`, {
                    withCredentials: true,
                    signal: controller.signal
                });

                const serverNotifications = Array.isArray(response.data) ? response.data : response.data.notifications || [];
                await db.notifications.bulkPut(serverNotifications);

                axios.delete(`${process.env.REACT_APP_API_URL}/user/delete-notifications`)
                    .catch((err) => {
                        console.error("Failed to delete server notifications:", err);
                    });

                // Refresh from Dexie
                const updatedNotifications = await db.notifications
                    .orderBy("timestamp")
                    .reverse()
                    .toArray();

                setNotifications(updatedNotifications);
                await loadChatUsernames(updatedNotifications);
                setServerCount(0);

            }
            catch (error) {
                if (error.code !== 'ERR_CANCELED') {
                    console.error('Failed to fetch notifications:', error);
                }
            }
        }

        fetchNotifications();
        return () => controller.abort();

    }, [isOpen]);

    const loadChatUsernames = async (notifications) => {
        const usernames = {};

        for (const notification of notifications) {
            if (
                notification.type === "message" ||
                notification.type === "attachment"
            ) {
                const userData = await db.chatUser.get(notification.chatId);

                if (userData?.username) {
                    usernames[notification.eventId] = userData.username;
                }
            }
        }

        setChatUsernames(usernames);
    };

    const notificationTypes = {
        vibe: {
            title: 'New vibe',
            icon: vibeSVG,
            color: 'green',
            message: (n) =>
                n.message ||
                `Someone vibed with your post`,
        },
        vibeCheck: {
            title: 'Vibe check',
            icon: (n) => vibeIcons[n.vibe] || vibeSVG,
            color: 'purple',
            message: (n) =>
                n.message ||
                "Someone wants to know how you're feeling today.",
        },
        message: {
            title: 'New message',
            icon: messageSVG,
            color: 'blue',
            message: (n) => {
                const username = chatUsernames[n.eventId];

                return username ? (
                    <>
                        <strong>{username}</strong> sent you a message.
                    </>
                ) : (
                    "You have a new message."
                );
            }
        },
        attachment: {
            title: 'New attachment',
            icon: messageSVG,
            color: 'orange',
            message: (n) => {
                const username = chatUsernames[n.eventId];

                return username ? (
                    <>
                        <strong>{username}</strong> sent you a attachment.
                    </>
                ) : (
                    "Someone sent you a photo."
                );
            }
        },
        coinTransfer: {
            title: 'Coins received',
            iconNode: <CoinIcon size={22} />,
            color: 'gold',
            message: (n) => n.amount
                ? <>Someone sent you <strong>{n.amount} Sakesnake Coins</strong>.</>
                : "Someone sent you Sakesnake Coins.",
        },
        streakReminder: {
            title: 'Keep your streak alive',
            iconNode: <StreakFlame size={20} />,
            color: 'orange',
            message: (n) => n.message || "Post today to keep your streak!",
        },
        echoMatch: {
            title: 'Echo match',
            icon: echoSVG,
            color: 'purple',
            message: (n) =>
                n.message || 'Your Echo has matching echoes.',
        },
    };

    // While closed, show what's waiting; once opened, everything is downloaded and listed
    const unreadCount = isOpen
        ? notifications.filter((notification) => !notification.read).length
        : localUnread + serverCount;

    const onNotificationClick = async (notification) => {
        try {
            // Delete notification from Dexie
            await db.notifications.delete(notification.eventId);

            // Update React state
            setNotifications((prev) =>
                prev.filter((n) => n.eventId !== notification.eventId)
            );

            // Close notification panel
            setIsOpen(false);

            // Navigate according to notification type
            switch (notification.type) {
                case "vibe":
                case "vibeCheck":
                    navigate(`/post/${notification.postId}`);
                    break;

                case "message":
                case "attachment":
                    navigate(`/user-chat/${notification.chatId}`);
                    break;

                case "echoMatch":
                    navigate(`/echoes/${notification.echoId}`);
                    break;

                case "coinTransfer":
                case "streakReminder":
                    navigate("/coins");
                    break;

                default:
                    console.warn("Unknown notification type:", notification.type);
            }
        }
        catch (error) {
            console.error("Failed to process notification:", error);
        }
    }

    return (
        <div className={`notification-center ${isOpen ? 'is-open' : ''}`}>

            {/* Notification bell */}
            <button
                type="button"
                className="notification-bell"
                aria-label="Notifications"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <img
                    src={notificationSVG}
                    alt="Notification Icon"
                />

                {unreadCount > 0 && (
                    <span className="notification-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Mobile backdrop */}
                    <button
                        type="button"
                        className="notification-backdrop"
                        aria-label="Close notifications"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Notification panel */}
                    <section
                        className="notification-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="notification-heading"
                    >
                        <header className="notification-header">
                            <h2 id="notification-heading">
                                Notifications
                            </h2>

                            <button
                                type="button"
                                className="notification-close"
                                aria-label="Close notifications"
                                onClick={() => setIsOpen(false)}
                            >
                                <span>X</span>
                            </button>
                        </header>

                        <div className="notification-list">
                            {notifications.length === 0 ? (
                                <div className="notification-state">
                                    You're all caught up.
                                </div>
                            ) : (
                                notifications.map((notification, index) => {
                                    const meta =
                                        notificationTypes[notification.type] ||
                                        {
                                            title: 'Notification',
                                            icon: notificationSVG,
                                            color: 'green',
                                            message: (n) =>
                                                n.message ||
                                                'You have a new notification.',
                                        };

                                    // Coins someone sent: answer right here
                                    if (notification.type === "coinTransfer" && notification.transferId) {
                                        return (
                                            <div className="notification-item notification-item-coins" key={notification.eventId || index}>
                                                <span className={`notification-icon ${meta.color}`}>{meta.iconNode}</span>
                                                <span className="notification-text">
                                                    <strong>{meta.title}</strong>
                                                    <span className="notification-message">{meta.message(notification)}</span>
                                                    <TransferRequest
                                                        compact
                                                        transfer={{ id: notification.transferId }}
                                                        onDone={() => {
                                                            db.notifications.delete(notification.eventId).catch(() => {});
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            type="button"
                                            className="notification-item"
                                            key={
                                                notification.eventId ||
                                                notification.id ||
                                                index
                                            }
                                            onClick={() => {
                                                onNotificationClick?.(notification);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <span
                                                className={`notification-icon ${meta.color}`}
                                            >
                                                {meta.iconNode ? meta.iconNode : <img
                                                    src={
                                                        typeof meta.icon === 'function'
                                                            ? meta.icon(notification)
                                                            : meta.icon
                                                    }
                                                    alt="vibe check icon"
                                                />}
                                            </span>

                                            <span className="notification-text">
                                                <strong>{meta.title}</strong>

                                                <span className="notification-message">
                                                    {meta.message(notification)}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}

export default NotificationCenter
