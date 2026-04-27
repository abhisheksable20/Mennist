import {getUserUid} from "./auth.js"

const form = document.getElementById('postForm');
const firebaseURL = 'https://api-i7cqcol4da-uc.a.run.app/'


// Inside your submit event handler
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const title = form.title.value; // from <input name="title">
  const description = form.description.value; // from <textarea name="description">
  const toast = document.getElementById("toast");

  getUserUid().then(async (id) => {
      const data = {
      title: title,
      content: description,
      userUniqueId: id,
    };

    try {
      const res = await axios.post(`${firebaseURL}submit-post`, data);
      const postId = res.data.postId;

      // Saving The content to local storage
      let savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
      savedPosts.push({
        id: postId,
        title: title,
        content: description,
        timestamp: Date.now()
      });

      localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
      toast.classList.add("show");

      setTimeout(() => {
        toast.classList.remove('show');
        window.location.href = "/";
      }, 2000)

    } catch (error) {
      console.error("Error uploading post:", error);
      alert("Failed to submit post. Please try again.");
    }
  }).catch((error) => {
    alert("Failed to get user ID. Please load the home page first.");
  });

});