import { useEffect, useState } from "react";
import "../styles/ChatPage.css";
import { db } from "../internalDatabase/db";
import { fetchBlockedUsers, unblockUser } from "../utils/blockUser";
import { loadAvatar } from "./Avatar/avatarService";
import { convertTimestampToReadable } from "../dataProcessing/dataProcessing";
import Avatar from "./Avatar/Avatar";
import PostHeaders from "./utils/PostHeaders";
import ChatLoading from "./ChatLoading";

function BlockedRow({ person, onUnblock }) {
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadAvatar(person.chatId).then((a) => active && setAvatar(a)).catch(() => {});
    return () => {
      active = false;
    };
  }, [person.chatId]);

  const unblock = async () => {
    setBusy(true);
    // Stays in the list (button enabled again) if it fails
    if (!(await onUnblock(person))) setBusy(false);
  };

  return (
    <div className="blocked-row">
      <div className="blocked-row-avatar">
        {avatar && <Avatar avatar={avatar} size={36} />}
      </div>
      <div className="blocked-row-text">
        <span className="blocked-row-name">{person.username}</span>
        <span className="blocked-row-date">Blocked · {convertTimestampToReadable(person.at)}</span>
      </div>
      <button type="button" className="coin-btn coin-btn-ghost coin-btn-small" onClick={unblock} disabled={busy}>
        {busy ? "Unblocking…" : "Unblock"}
      </button>
    </div>
  );
}

function BlockedUsersPage(props) {
  const [people, setPeople] = useState(null); // null while loading
  const showAlert = props.alert || (() => {});

  useEffect(() => {
    document.title = "Mennist | Blocked users";
    let active = true;

    (async () => {
      try {
        const list = await fetchBlockedUsers();
        // Names are only stored on this device
        const saved = await db.chatUser.bulkGet(list.map((p) => p.chatId));
        if (active) setPeople(list.map((p, i) => ({ ...p, username: saved[i]?.username || "Unknown user" })));
      }
      catch (listErr) {
        if (active) {
          setPeople([]);
          showAlert("Couldn't load blocked users.", "alert");
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnblock = async (person) => {
    try {
      await unblockUser(person.chatId);
      setPeople((prev) => prev.filter((p) => p.chatId !== person.chatId));
      showAlert(`You unblocked ${person.username}.`, "success");
      return true;
    }
    catch (unblockErr) {
      showAlert("Couldn't unblock. Please try again.", "alert");
      return false;
    }
  };

  return (
    <>
      {people === null && <ChatLoading />}
      <div className="container my-5">
        <PostHeaders splText={"PRIVATE CHATS"} heading={"Blocked users"} subHeading={"People you block can't message you, send you coins or start a new chat. They aren't told."} />

        {people && people.length === 0 && <p className="blocked-empty">You haven't blocked anyone.</p>}
        {people && people.length > 0 && (
          <div className="blocked-list">
            {people.map((person) => <BlockedRow key={person.chatId} person={person} onUnblock={handleUnblock} />)}
          </div>
        )}
      </div>
    </>
  );
}

export default BlockedUsersPage;
