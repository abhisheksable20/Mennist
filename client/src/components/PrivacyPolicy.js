// Privacy Policy. Keep it in step with the code: retention times, providers and
// what is stored come from functions/config/*.js and the routes.
function PrivacyPolicy() {
    document.title = "Mennist | Privacy Policy";

    return (
        <div className="container py-5">
            <h1 className="mb-4 post-title">Privacy Policy</h1>
            <p className="post-title">
                <strong>Last Updated:</strong> Nov 21, 2026
            </p>

            <p className="testing-notice my-4">
                Mennist is in beta. Features and the way we handle data may change.
                When they do, we will update this page and its date.
            </p>

            <p className="terms-para">
                This Privacy Policy explains what Mennist ("Mennist," "we," "our," or "us")
                stores when you use mennist.com, why, who helps us run it, how long data is
                kept, and how to delete it. By using Mennist you acknowledge this policy.
            </p>

            <h3 className="post-title pt-3">1. At a Glance</h3>
            <ul className="terms-para">
                <li>No email, phone number, name, or password is needed. Your account is a key that lives in your browser.</li>
                <li>Chat messages and files are end-to-end encrypted in your browser. We cannot read them. File names are not encrypted.</li>
                <li>Text messages leave our servers once the other person's browser receives them. Files are deleted once downloaded, or after 30 days.</li>
                <li>Post text and Echo text are sent to Google's Gemini AI to sort posts into categories and to find similar Echoes.</li>
                <li>Sakesnake Coins are a points system with no money value. We don't take payments.</li>
                <li>No ads, no third-party analytics, and we don't sell your data.</li>
                <li>Delete My Profile removes your account and the data linked to it.</li>
            </ul>

            <h3 className="post-title pt-3">2. Your Account</h3>
            <p className="terms-para">
                When you start using Mennist, your browser creates an encryption key pair.
                The private key stays in your browser. Only the public key is sent to us.
                Your account is linked to that public key, not to your identity.
            </p>
            <p className="terms-para">For your account, we store:</p>
            <ul className="terms-para">
                <li>A random account ID and your public key.</li>
                <li>When the account was created, and whether your chat is turned on or off.</li>
                <li>A device identifier made by an open-source library (FingerprintJS) from your browser's characteristics. It runs in your browser and is sent only to us, to help limit abuse such as mass account creation.</li>
                <li>A login session. Its ID is kept in one secure cookie (see section 12). A session lasts up to 10 years.</li>
            </ul>
            <p className="terms-para">
                To sign back in to an existing account, your browser proves it holds the
                private key by answering a one-time challenge. The private key is never sent.
            </p>

            <h4 className="post-title pt-3">Recovery Key</h4>
            <p className="terms-para">
                If you set up account recovery, we create a recovery key and show it to you
                once. We store only a keyed hash of it, never the key itself, so we cannot
                show it to you again or recover it for you. A recovery key works once: using
                it moves your account to the new device, signs out every other device, and
                gives you a new key. A browser whose key was replaced deletes its local copy
                of your account data the next time it opens Mennist.
            </p>

            <h3 className="post-title pt-3">3. What You Create</h3>

            <h4 className="post-title pt-3">Posts</h4>
            <p className="terms-para">
                We store each post's title, text, time, and your account ID, plus a copy
                under your profile so you can see and delete your posts. Your title and text
                are sent to Google Gemini, which assigns a category and an 18+ label. Posts
                are shown to signed-in users in the feed and to anyone who opens a post's
                link. Posts don't show your name, but they carry an anonymous chat ID, so
                people can start a chat with the author.
            </p>

            <h4 className="post-title pt-3">Vibes, Vibe Checks and Post Activity</h4>
            <p className="terms-para">
                When you vibe with a post or choose a Vibe Check, we store which account did
                it, so each account counts once, and we update the post's totals. Totals are
                public; who voted is not shown. We also count, per account and post, whether
                you viewed, saved, shared, or started a chat from a post.
            </p>

            <h4 className="post-title pt-3">Echoes</h4>
            <p className="terms-para">
                We store your Echo's text, time, status, and match results. To find matches,
                your Echo is compared with the newest Echoes from other people (about 150 at
                a time) using Google Gemini. <strong>Your Echo text can be shown to other
                people as a match for theirs</strong>, together with an anonymous chat ID so
                they can message you. Your name or account is never shown. Similarity scores
                are automated estimates.
            </p>

            <h4 className="post-title pt-3">Veil (Avatar)</h4>
            <p className="terms-para">
                We store the Veil options you choose, such as face, hair, colours, and
                premium items you unlocked. Your Veil is shown next to your posts and in chats.
            </p>

            <h4 className="post-title pt-3">Reports</h4>
            <p className="terms-para">
                When you report a post or Echo, we store the reason, the time, your account
                ID, and the account that owns the content, so we can review it. The person
                you report is not told who reported them.
            </p>

            <h3 className="post-title pt-3">4. Chat and Files</h3>

            <h4 className="post-title pt-3">Messages</h4>
            <p className="terms-para">
                Messages are encrypted in your browser with the other person's public key
                (libsodium, X25519). We store the encrypted message, its time, and the
                sender's public key and anonymous chat ID only until the recipient's browser
                downloads it. After that it is deleted from our servers and kept only in the
                two browsers. We cannot read message contents.
            </p>
            <p className="terms-para">
                Encryption doesn't hide everything. We can see which accounts message each
                other and when, whether a chat was opened for free or with coins, and the
                preview data needed to list your chats. The names shown for chat partners
                are random and made in your own browser, so each person sees a different name.
            </p>

            <h4 className="post-title pt-3">Files</h4>
            <p className="terms-para">
                Files are encrypted in your browser before upload and stored encrypted in
                Google Cloud Storage. <strong>We can see each file's name, type, and size</strong>,
                because those are needed to deliver it. Encrypted files are deleted:
            </p>
            <ul className="terms-para">
                <li>as soon as the recipient downloads the file;</li>
                <li>after 30 days if the recipient never downloads it;</li>
                <li>after 24 hours if an upload was started but never finished;</li>
                <li>when the recipient deletes the chat or their profile.</li>
            </ul>
            <p className="terms-para">
                Before saving a file, the recipient's browser checks that its contents match
                its type, and blocks risky files such as documents with macros.
            </p>
            <p className="terms-para">
                Supported formats: JPG, JPEG, PNG, WEBP, GIF, MP4, 3GP, MOV, MP3, M4A, AAC,
                OGG, OPUS, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, and ZIP, up to 1 GB.
            </p>

            <h3 className="post-title pt-3">5. Sakesnake Coins and Ritzz</h3>
            <p className="terms-para">
                For coins and your Ritzz (daily posting streak), we store your coin balance,
                a history of what you earned and spent, your current and longest Ritzz, items
                you unlocked, daily counters (such as free chats and rematches used), coin
                transfers between accounts and their status, people you blocked from sending
                you coins, and your transfer settings. Coins have no money value and we don't
                process payments, so we hold no payment or bank information.
            </p>

            <h3 className="post-title pt-3">6. Notifications</h3>
            <p className="terms-para">
                Notifications, such as new messages, vibes, Echo matches, coins received, and
                Ritzz reminders, are kept on our servers until you open the notification bell.
                They then move to your browser and are deleted from our servers.
            </p>

            <h3 className="post-title pt-3">7. Technical Information</h3>
            <ul className="terms-para">
                <li><strong>IP address:</strong> used for rate limiting (for example, how many accounts or requests come from one address). These counters expire automatically after their time window, which is at most 24 hours.</li>
                <li><strong>Server logs:</strong> our hosting provider records requests and errors (time, address requested, status, and error details) to keep the service running and secure.</li>
                <li><strong>Browser details:</strong> the website address the request came from, used to block requests from other websites.</li>
            </ul>

            <h3 className="post-title pt-3">8. Stored in Your Browser</h3>
            <p className="terms-para">
                Mennist keeps some data only on your device, in IndexedDB and local storage:
                your encryption keys, decrypted messages and downloaded files, chat partner
                names, notifications you've opened, saved posts, your vibe choices, your Veil,
                and small settings. We can't see this data. It stays until you delete your
                profile or clear Mennist's site data in your browser.
            </p>

            <h3 className="post-title pt-3">9. How We Use Information</h3>
            <ul className="terms-para">
                <li>To run Mennist's features: accounts, posts, Echoes, chat, files, coins, Ritzz, Veils, and notifications.</li>
                <li>To keep it safe: rate limits, blocking abuse and spam, handling reports, and enforcing our Terms.</li>
                <li>To fix problems and keep the service working.</li>
                <li>To meet legal obligations.</li>
            </ul>
            <p className="terms-para">
                We don't use your data for advertising, don't build advertising profiles,
                and don't sell or rent your data.
            </p>

            <h3 className="post-title pt-3">10. Who Helps Us Run Mennist</h3>
            <ul className="terms-para">
                <li><strong>Google Firebase and Google Cloud</strong> (United States): website hosting, database, file storage, and server code.</li>
                <li><strong>Google Gemini API</strong>: sorting posts into categories and finding similar Echoes. It receives post titles and text, and Echo text.</li>
                <li><strong>Upstash</strong>: stores the short-lived rate-limit counters keyed by IP address or account ID.</li>
                <li><strong>Google Fonts and jsDelivr</strong>: your browser loads fonts and the Bootstrap style library from them, so they receive your IP address and browser details.</li>
            </ul>
            <p className="terms-para">
                These providers process data under their own terms. See{" "}
                <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">Firebase's privacy information</a>.
                We may also share information when the law requires it, to investigate
                serious abuse, or to protect people's safety. If Mennist is ever transferred
                to a new owner, this data may move with it under the same protections.
            </p>

            <h3 className="post-title pt-3">11. Anonymity Has Limits</h3>
            <p className="terms-para">
                Mennist doesn't ask who you are, but anonymity is not a guarantee. What you
                write can identify you, the other person in a chat can screenshot or share
                what you send, and we process technical information such as IP addresses.
                Don't share anything you couldn't accept becoming known.
            </p>

            <h3 className="post-title pt-3">12. Cookies</h3>
            <p className="terms-para">
                Mennist uses one essential cookie, <code>__session</code>, to keep you signed
                in. It is secure and HTTP-only, so page scripts can't read it, and it lasts
                up to 10 years. We use no advertising or tracking cookies. Blocking it,
                including in some private-browsing modes, stops sign-in from working.
            </p>

            <h3 className="post-title pt-3">13. How Long We Keep Data</h3>
            <ul className="terms-para">
                <li><strong>Account, posts, Echoes, Veil, coins, and Ritzz:</strong> until you delete them or your profile.</li>
                <li><strong>Text messages:</strong> until the recipient's browser receives them.</li>
                <li><strong>Files:</strong> until downloaded, or 30 days at most (24 hours for unfinished uploads).</li>
                <li><strong>Notifications:</strong> until you open the bell.</li>
                <li><strong>Sign-in challenges:</strong> expire after 2 minutes and are deleted within an hour.</li>
                <li><strong>Rate-limit counters:</strong> 24 hours at most.</li>
                <li><strong>Reports:</strong> as long as needed to review them and keep Mennist safe.</li>
                <li><strong>Server logs and backups:</strong> for a limited time set by our hosting provider.</li>
            </ul>

            <h3 className="post-title pt-3">14. Delete My Profile</h3>
            <p className="terms-para">
                You can delete your profile from your Veil page. This permanently removes:
            </p>
            <ul className="terms-para">
                <li>your account, public key, sessions, and recovery key;</li>
                <li>your posts with their vibes and Vibe Checks;</li>
                <li>your Echoes, their matches, and their place in matching;</li>
                <li>your coins, coin history, Ritzz, and unlocked items;</li>
                <li>chats and files waiting for you, and your notifications;</li>
                <li>the Mennist data stored in that browser.</li>
            </ul>
            <p className="terms-para">Some things are not removed:</p>
            <ul className="terms-para">
                <li>Messages and files you already sent stay on the other person's device. Ones not yet received are deleted when received, or files after 30 days.</li>
                <li>Coin transfers stay in the other person's history.</li>
                <li>Reports you made, and copies in backups or logs, are kept for a limited time.</li>
                <li>Data in other browsers where you used the account. Clear Mennist's site data there.</li>
            </ul>
            <p className="terms-para">
                Deletion runs in the background and may take a few minutes to finish. It
                cannot be undone, and a recovery key cannot bring the profile back.
            </p>

            <h3 className="post-title pt-3">15. Security</h3>
            <p className="terms-para">
                Besides end-to-end encryption, we use HTTPS everywhere, secure HTTP-only
                cookies, a database that browsers can't read or write directly, rate limits,
                and short-lived download links for files. No system is perfectly secure. A lost
                or shared device, an exposed recovery key, or a screenshot can reveal your data.
            </p>

            <h3 className="post-title pt-3">16. Your Rights</h3>
            <p className="terms-para">
                Depending on where you live, you may have the right to access, correct, or
                delete your personal data, withdraw consent, or complain to a data-protection
                authority. Most data can be deleted directly with Delete My Profile. For other
                requests, email us. Because accounts are anonymous, we may need you to prove
                the account is yours, for example from the browser that holds its key. We
                can't act on data we can't link to you.
            </p>

            <h3 className="post-title pt-3">17. Children</h3>
            <p className="terms-para">
                Mennist is not for children below the minimum age in our Terms and
                Conditions. We don't knowingly collect data from them. If you believe a child
                is using Mennist, contact us.
            </p>

            <h3 className="post-title pt-3">18. Where Data Is Processed</h3>
            <p className="terms-para">
                Our servers and database are in the United States (Google Cloud,
                us-central1). Our providers may also process data in other countries. Where
                the law requires safeguards for international transfers, we rely on our
                providers' contractual and security protections.
            </p>

            <h3 className="post-title pt-3">19. Changes</h3>
            <p className="terms-para">
                We will post changes on this page with a new date. For important changes we
                will also show a notice in Mennist.
            </p>

            <h3 className="post-title pt-3">20. Contact</h3>
            <p className="terms-para">
                Questions or privacy requests:{" "}
                <a href="mailto:vibetalks@mennist.com">vibetalks@mennist.com</a>.
            </p>
        </div>
    )
}

export default PrivacyPolicy
