# Mennist 🌑

**Be real. Stay anonymous. Find your people.**

Mennist is an anonymous social platform where people can share their thoughts, secrets, experiences, and dreams without revealing their identity. It provides a space for authentic expression, meaningful connections, and discovering people who think like you.

Whether you want to share something you cannot say out loud, find someone who relates to your experience, or connect through anonymous conversations, Mennist gives your thoughts a place to belong.

## ✨ Features

### 📝 Anonymous Posts
- Share thoughts, secrets, stories, and personal experiences anonymously.
- Browse posts shared by other users.
- Explore posts through categories.
- Discover more content with infinite scrolling and load-more functionality.

### 💚 Vibe Check
- React to posts using different vibes.
- Express how a post makes you feel.
- Explore reactions from the community.
- Track vibe selections and counts.

### 🌌 Echo — Find Your Thought Twin
- Share your dreams and thoughts anonymously.
- Discover similar experiences shared by other users.
- Use AI-powered similarity matching to find related Echoes.
- Explore matching Echoes and their similarity scores.

### 💬 Anonymous Chat
- Connect with other users through anonymous conversations.
- Use public-key cryptography and encrypted messages.
- Keep chat data and encryption keys stored locally where appropriate.

### 🎭 Customizable Pixel Avatars
- Create a personalized pixel-style avatar.
- Customize skin, hair, hair color, eyes, nose, mouth, accessories, and facial hair.
- Save avatar preferences to your profile.
- Express yourself without needing to reveal your real identity.

### 🔖 Save Posts
- Bookmark posts for later.
- Store saved posts locally in the browser.
- Access saved content without creating a public identity for every interaction.

### 🔞 Content Controls
- Blur 18+ content to provide additional control over the browsing experience.

### 🔐 Privacy-Focused Design
- Anonymous posting without requiring an account.
- Local storage for selected user data and encryption keys.
- Backend APIs for server-side operations.
- Profile deletion functionality to support user data removal.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| React Router | Client-side navigation |
| Bootstrap | Responsive UI and components |
| Firebase Hosting | Frontend hosting |
| Firebase Cloud Functions | Backend API |
| Firebase Realtime Database | Data storage |
| Dexie.js | IndexedDB management |
| libsodium | Cryptographic operations |
| Axios | HTTP requests |
| Gemini API | AI-powered similarity and related features |

## 📁 Project Structure

```text
mennist/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── context/        # Shared application state
│   │   └── ...
│   └── package.json
│
├── functions/              # Firebase Cloud Functions
│   ├── index.js
│   ├── package.json
│   └── ...
│
├── firebase.json           # Firebase configuration
├── .firebaserc             # Firebase project configuration
├── .gitignore
└── README.md
```

*Note: Adjust the directory names above to match your actual repository structure.*

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm
- [Git](https://git-scm.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/mennist.git
cd mennist
```

Replace `YOUR_USERNAME` with your GitHub username or the repository owner's username.

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Configure Environment Variables

Configure the environment variables required by your frontend and backend.

For example, if your frontend uses Create React App:

```env
REACT_APP_API_URL=http://localhost:5000/YOUR_PROJECT_ID/us-central1/api
```

Configure backend secrets and Firebase settings separately according to the APIs and services you use.

**Important:** Never commit API keys, private keys, authentication secrets, or `.env` files containing sensitive values to GitHub.

### 4. Start the Frontend

```bash
cd client
npm start
```

The React application will usually be available at:

```text
http://localhost:3000
```

### 5. Run Firebase Emulators

From the project root, configure the Firebase Emulator Suite and start the emulators required by your project.

```bash
firebase emulators:start
```

Ensure your frontend API configuration points to the appropriate local emulator endpoints.

### 6. Build the Frontend

```bash
cd client
npm run build
```

This generates an optimized production build.

### 7. Deploy to Firebase

From the project root, after configuring your Firebase project:

```bash
firebase deploy
```

Deploy only the required services if you prefer to manage Hosting and Functions separately.

## 🔒 Security and Privacy

Mennist is designed with anonymous expression and privacy in mind.

- Anonymous posting does not necessarily mean all interactions are untraceable.
- Sensitive operations should be validated on the server.
- Database access should be protected by appropriate security rules.
- Encryption keys should be handled carefully and never exposed through logs or public APIs.
- Profile deletion should account for associated posts, chats, profile data, and other related records.
- AI-powered features should avoid sending unnecessary personal information to external services.

**Security note:** The level of privacy and end-to-end encryption depends on the actual implementation, key management, server behavior, and Firebase security rules.

## 🗺️ Roadmap

- [x] Anonymous posting
- [x] Vibe Check
- [x] Echo similarity matching
- [x] Anonymous chat
- [x] Customizable pixel avatars
- [x] Local post bookmarking
- [x] Profile deletion functionality
- [ ] Further performance optimization
- [ ] Enhanced moderation and reporting tools
- [ ] Additional personalization features

*The checklist should reflect the features actually completed and deployed in your repository.*

## 🤝 Contributing

Contributions, ideas, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.

   ```bash
   git checkout -b feature/your-feature
   ```

3. Commit your changes.

   ```bash
   git commit -m "Add your feature"
   ```

4. Push your branch.

   ```bash
   git push origin feature/your-feature
   ```

5. Open a pull request.

## 📄 License

A license has not yet been specified. Add a `LICENSE` file and update this section before distributing the project under an open-source license.

## 💭 The Idea Behind Mennist

Sometimes, the thoughts we keep to ourselves are the ones we most want to share.

Mennist is built around the idea that people should have a space to express themselves honestly, discover shared experiences, and connect without the pressure of revealing who they are.

**Every thought has a twin. Find yours on Mennist.**

---

Made with 🖤 for honest thoughts and anonymous connections.
