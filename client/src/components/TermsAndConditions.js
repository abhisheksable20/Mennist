// Terms and Conditions. Coin numbers below come from functions/config/coins.js:
// change both together.
function TermsAndConditions() {
    document.title = "Mennist | Terms & Conditions";

    return (
        <div className="container py-5">
            <h1 className="mb-4 post-title">Terms and Conditions</h1>
            <p className="post-title">
                <strong>Last Updated:</strong> Nov 28, 2026
            </p>

            <p className="testing-notice my-4">
                Mennist is in beta. Features may change, have bugs, or be unavailable at
                times. Coin amounts, prices, and limits may also change while we test them.
            </p>

            <p className="terms-para">
                Welcome to Mennist. By using mennist.com you agree to these Terms and
                Conditions and to our Privacy Policy. If you don't agree, please don't use Mennist.
            </p>

            <h3 className="post-title pt-3">1. What Mennist Is</h3>
            <p className="terms-para">
                Mennist is a place for anonymous expression. You can share posts, react with
                vibes and Vibe Checks, share Echoes and find people with similar ones, chat
                and send files with end-to-end encryption, customise your Veil (avatar), and
                earn Sakesnake Coins and a daily Ritzz.
            </p>

            <h3 className="post-title pt-3">2. Who Can Use Mennist</h3>
            <p className="terms-para">
                You must be at least 13 years old, or older if the law where you live sets a
                higher minimum age for using services like this without a parent's consent.
                By using Mennist you confirm you meet this requirement.
            </p>

            <h3 className="post-title pt-3">3. Your Account and Keys</h3>
            <ul className="terms-para">
                <li>Your account is a cryptographic key stored in your browser. There is no email or password, and we can't reset it for you.</li>
                <li><strong>If you clear your browser data or lose your device without a recovery key, your account, coins, Ritzz, and chats are gone for good.</strong> Set up a recovery key on your Veil page.</li>
                <li>Anyone who has your recovery key can take over your account. Keep it private. If you think someone saw it, make a new one: the old one stops working.</li>
                <li>A recovery key works once. Using it signs out every other device and gives you a new key, which you must save again.</li>
                <li>You are responsible for activity on your account and for keeping your device secure.</li>
                <li>Don't create accounts in bulk or use multiple accounts to collect coins, avoid limits, or get around a restriction.</li>
            </ul>

            <h3 className="post-title pt-3">4. Your Content</h3>
            <p className="terms-para">
                You're responsible for everything you post, send, or share: posts, Echoes,
                messages, files, reports, and your Veil.
            </p>
            <ul className="terms-para">
                <li>Only share content you have the right to share and that is legal where you are.</li>
                <li>Don't share private information about other people.</li>
                <li>Think before sharing details that could identify you. Once shared, content can be copied or screenshotted.</li>
            </ul>
            <p className="terms-para">
                You keep ownership of your content. You give Mennist a non-exclusive,
                worldwide, royalty-free licence to store, process, and display it only as
                needed to run Mennist. That includes showing posts in the feed, sending post
                and Echo text to our AI provider for categories and matching, and showing
                your Echo text to other people as a match. The licence ends when the content
                is deleted, except for copies kept for a limited time in backups or logs.
            </p>

            <h3 className="post-title pt-3">5. Not Allowed</h3>
            <p className="terms-para">Don't use Mennist to:</p>
            <ul className="terms-para">
                <li>harass, threaten, bully, stalk, or promote hatred or discrimination;</li>
                <li>encourage violence, self-harm, or crime;</li>
                <li>share sexual content involving minors, or any content that exploits or endangers children;</li>
                <li>share someone's private information or intimate images without their consent;</li>
                <li>impersonate others or mislead people about who you are;</li>
                <li>spam, scam, or send malware, harmful files, or deceptive links;</li>
                <li>infringe copyright, trademarks, or other rights;</li>
                <li>buy, sell, or trade coins, items, or accounts for money or anything outside Mennist;</li>
                <li>use bots, scripts, or scraping, or try to get around rate limits or security, or access other people's data or accounts;</li>
                <li>exploit bugs, for example to get coins or items you didn't earn.</li>
            </ul>

            <h3 className="post-title pt-3">6. Posts, Vibes, and Vibe Checks</h3>
            <ul className="terms-para">
                <li>Posts are anonymous, but they carry a chat ID so others can message the author. Anyone with a post's link can read it.</li>
                <li>Posts are automatically given a category and may be labelled 18+ by AI. These labels can be wrong.</li>
                <li>Each account can vibe with a post once and pick one Vibe Check per post. Vibe Check options are unlocked with coins.</li>
                <li>You can delete your own posts at any time.</li>
            </ul>

            <h3 className="post-title pt-3">7. Echoes</h3>
            <ul className="terms-para">
                <li>Echoes are compared with other people's recent Echoes by AI to find similar ones. <strong>Your Echo text may be shown to others as a match</strong>, and they can start a chat with you from it.</li>
                <li>Similarity scores are automated estimates. A match doesn't mean two people know each other or had the same experience.</li>
                <li>You get 3 free rematches a day; after that a rematch costs 5 coins. If matching fails, the coins or free rematch are given back.</li>
                <li>Don't use Echoes to identify, track down, or harass anyone.</li>
            </ul>

            <h3 className="post-title pt-3">8. Chat and Files</h3>
            <ul className="terms-para">
                <li>Messages and files are end-to-end encrypted. We can't read them, so we can't recover lost messages or check their contents. You are responsible for what you send.</li>
                <li>You can start 3 new chats a day for free. After that, starting a chat with someone new costs 5 coins. If they don't reply within 48 hours, you get the coins back. Once a chat is open, it stays free for both people.</li>
                <li>You can turn your chat off at any time. People can't message you while it's off.</li>
                <li>You can block anyone from a chat. While they're blocked, neither of you can send the other messages, files, or coins, and they can't start a new chat with you. They aren't told. You can unblock them from the chat or from Blocked users.</li>
                <li>Ticks show when your messages were delivered and read. If you turn read receipts off, others won't see when you've read their messages, and you won't see when they've read yours.</li>
                <li>Files can be up to 1 GB, and only supported types are allowed: images, videos, audio, PDFs, Office documents, text, CSV, and ZIP. Files with macros or other risky content are blocked.</li>
                <li><strong>Files are deleted from our servers once downloaded, or after 30 days if never downloaded.</strong> Save files you want to keep. A downloaded file can't be downloaded again from the chat.</li>
                <li>Only open files from people you trust.</li>
            </ul>

            <h3 className="post-title pt-3">9. Sakesnake Coins</h3>
            <p className="terms-para">
                Sakesnake Coins are virtual points for use inside Mennist only.
            </p>
            <ul className="terms-para">
                <li><strong>Coins have no money value.</strong> They can't be bought with money, sold, exchanged for cash or anything outside Mennist, or withdrawn. They aren't your property: you have a limited, revocable permission to use them on Mennist.</li>
                <li><strong>How you earn coins:</strong> 50 when you join; 2 for your first post each day that has at least 20 characters; Ritzz rewards (5 at 3 days, 20 at 7, 50 at 15, and 120 at 30 and every 30 days after); 15 once for setting up a recovery key; and coins other people send you.</li>
                <li><strong>How you spend coins:</strong> Veil items, Vibe Check options, Ritzz freezes, extra Echo rematches, and new chats beyond the free ones.</li>
                <li><strong>Sending coins:</strong> your account must be at least 7 days old and you must have reached a 7-day Ritzz. You can send at least 5 coins at a time, up to 100 a day, and receive up to 200 a day. A small cut (5% to 30%, at least 1 coin) is removed, and it grows when you send to the same person often. The receiver has 48 hours to accept, otherwise the coins come back to you. Receivers can decline, block senders, or turn off transfers.</li>
                <li>Purchases are final, except for the automatic refunds described in these Terms.</li>
                <li>We may change prices, rewards, and limits. If we find abuse, bugs, or coins gained against these Terms, we may correct balances, remove items, or limit coin features. If Mennist or the coin feature shuts down, coins and items end without compensation.</li>
            </ul>

            <h3 className="post-title pt-3">10. Ritzz (Daily Streak)</h3>
            <ul className="terms-para">
                <li>Your Ritzz grows by one each day you post at least once (at least 20 characters). Days are counted in Indian Standard Time (IST).</li>
                <li>Missing a day resets it unless you have a Ritzz freeze, which covers one missed day. You can hold up to 2.</li>
                <li>Your longest Ritzz is kept and unlocks some features, such as sending coins and the Mythic Veil.</li>
            </ul>

            <h3 className="post-title pt-3">11. Veil and Premium Items</h3>
            <ul className="terms-para">
                <li>Your Veil is an avatar for self-expression. It doesn't verify who you are.</li>
                <li>Premium items are unlocked with coins and stay on your account. They give no advantage beyond how your Veil looks, plus a tier badge.</li>
                <li>The Mythic Veil is limited to 100 owners in total and needs a 30-day Ritzz. Its look is generated from your account and can't be chosen or re-rolled.</li>
                <li>Don't use your Veil to impersonate anyone.</li>
            </ul>

            <h3 className="post-title pt-3">12. Reporting and Moderation</h3>
            <p className="terms-para">
                You can report posts and Echo matches. We may review, hide, or remove
                content, reset coins, or restrict or end accounts that break these Terms or
                put others at risk. We may use automated tools to help. We can't catch
                everything, and because chats are encrypted we can't see their contents
                unless a participant reports them to us.
            </p>

            <h3 className="post-title pt-3">13. Limits and Fair Use</h3>
            <p className="terms-para">
                To keep Mennist fast and safe, we limit how often actions can be done, for
                example posting, sending messages and files, creating accounts, using
                recovery keys, and AI features. If you hit a limit, wait and try again.
            </p>

            <h3 className="post-title pt-3">14. Third-Party Services</h3>
            <p className="terms-para">
                Mennist relies on providers such as Google Firebase and Google Cloud, Google
                Gemini, and Upstash, as described in the Privacy Policy. We don't control
                them and aren't responsible for their outages.
            </p>

            <h3 className="post-title pt-3">15. Deleting Your Profile</h3>
            <p className="terms-para">
                You can delete your profile from your Veil page. This permanently removes
                your account, posts, Echoes, coins, Ritzz, items, and chats waiting for you,
                as explained in the Privacy Policy. It can't be undone, including with a
                recovery key, and coins and items are not refunded. Messages and files you
                already sent remain with their recipients.
            </p>

            <h3 className="post-title pt-3">16. Mennist's Rights</h3>
            <p className="terms-para">
                Mennist's name, logo, design, Veil artwork, and software belong to Mennist.
                Don't copy or reuse them without permission, except as the law allows.
            </p>

            <h3 className="post-title pt-3">17. No Warranty</h3>
            <p className="terms-para">
                Mennist is provided "as is" and "as available." We don't promise it will
                always be online, error-free, or secure, that AI labels and Echo matches are
                accurate, or that content from other users is true or safe.
            </p>

            <h3 className="post-title pt-3">18. Limitation of Liability</h3>
            <p className="terms-para">
                To the extent the law allows, Mennist and its operators are not liable for
                indirect or consequential losses, or for lost data, messages, coins, items,
                or Ritzz, arising from your use of Mennist, other users' content or actions,
                lost keys, or service interruptions. Nothing here limits liability that
                can't be limited by law.
            </p>

            <h3 className="post-title pt-3">19. Indemnity</h3>
            <p className="terms-para">
                To the extent the law allows, you agree to cover Mennist's costs from claims
                caused by your content, your misuse of Mennist, or your breach of these Terms.
            </p>

            <h3 className="post-title pt-3">20. Suspension and Termination</h3>
            <p className="terms-para">
                We may suspend or end access to Mennist or to some features, such as coins or
                chat, if you break these Terms, if there is a security risk, or if the law
                requires it. You can stop using Mennist and delete your profile at any time.
            </p>

            <h3 className="post-title pt-3">21. Changes to These Terms</h3>
            <p className="terms-para">
                We may update these Terms. The new version will show a new date, and for
                important changes we will show a notice in Mennist. If you keep using
                Mennist after changes take effect, you accept the new Terms.
            </p>

            <h3 className="post-title pt-3">22. Contact</h3>
            <p className="terms-para">
                Questions about these Terms:{" "}
                <a href="mailto:vibetalks@mennist.com">vibetalks@mennist.com</a>.
            </p>
        </div>
    )
}

export default TermsAndConditions
