function saveProfile() {

  const education = document.getElementById("education").value;
  const skills = document.getElementById("skills").value;
  const interests = document.getElementById("interests").value;

  document.getElementById("displayEducation").textContent = education || "Not set";
  document.getElementById("displaySkills").textContent = skills || "Not set";
  document.getElementById("displayInterests").textContent = interests || "Not set";
}
