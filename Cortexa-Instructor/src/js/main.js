// const { createClient } = supabase;
// const supabaseProjectUrl = "https://iuiwdjtmdeempcqxeuhf.supabase.co";
// const supabaseKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aXdkanRtZGVlbXBjcXhldWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTY1MDcsImV4cCI6MjA2MDMzMjUwN30.XfSmnKA8wbsXIA1qkfYaRkzxtEdudIDNYbSJu-M5Zag";
// export const supaClient = createClient(supabaseProjectUrl, supabaseKey);
const { createClient } = supabase;
const supabaseProjectUrl = "https://nwwqsqkwmkkuunczucdm.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3FzcWt3bWtrdXVuY3p1Y2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzEyODIsImV4cCI6MjA2MjEwNzI4Mn0.EF6CGrpM3bjxBo4-ItU3S1BPjfVHdv2HnvoeAdfPZug";
export const supaClient = createClient(supabaseProjectUrl, supabaseKey);
const instructorId = sessionStorage.getItem("instructorId");
const logOutButton = document.querySelector(".log-out");
// const logoutButton = document.querySelector(".log-out");
function isUserLoggedIn() {
  if (!instructorId && !window.location.href.includes("index.html")) {
    alert("sign in first");
    window.location.href = "../../../index.html"; // Redirect to the sign-in page
    return;
  }
}
isUserLoggedIn();
function logOut() {
  // const confirmation = confirm("Are you sure you want to log out!");
  // if (!confirmation) return;
  sessionStorage.removeItem("instructorId");
  sessionStorage.removeItem("institution_id");
  sessionStorage.removeItem("institution_name");
  window.location.href = "../../../index.html";
}
// logOutButton.addEventListener("click", logOut);
export async function getInstructorName(instructorId) {
  const { data, error } = await supaClient
    .from("instructor")
    .select("instructor_name")
    .eq("instructor_id", +instructorId);
  if (error) {
    console.error("Error fetching student name:", error);
    return null;
  }
  if (data && data.length > 0) {
    // const name = data[0].student_name;
    // userName.textContent = name;
    return data[0].instructor_name;
  }
}
getInstructorName(instructorId);
// if (sessionStorage.getItem("studentId")) {
//   sessionStorage.removeItem("studentId");
//   alert("please log in again");
//   window.location.href = "../../../index.html";
// }

export async function getInstitutionId(instructorId) {
  const { data, error } = await supaClient
    .from("instructor_institution")
    .select("institution_id")
    .eq("instructor_id", instructorId);

  if (error) {
    console.error("Error fetching institution_id:", error);
    return null;
  }

  if (data && data.length > 0) {
    const institutionId = data[0].institution_id;
    sessionStorage.setItem("institution_id", institutionId);
    return institutionId;
  } else {
    return null;
  }
}
getInstitutionId(instructorId).then((institutionId) => {
  if (institutionId) {
    getInstitutionName().then((institutionName) => {
      if (institutionName) {
        console.log("institutionName", institutionName);
        if (isInstitutionSchool()) {
          const assignment = document.querySelector("#assignment a");
          const project = document.querySelector("#project a");
          assignment.textContent = "Homework";
          project.textContent = "Actvities";
          const course = document.querySelector("#course");
          const courseName = document.querySelector(".course_name");
          const courseHeader = document.querySelector(".schedule-title");
          if (course) {
            courseHeader.textContent = "Subject Managent";
            courseName.textContent = "subject name";
            course.textContent = "subject";
          }
        }
      } 
    });
  } else {
    console.log("No institution ID found for the given instructor ID.");
  }
});

async function getInstitutionName() {
  console.log("institutionId", sessionStorage.getItem("institution_id"));
  
  const institutionId = sessionStorage.getItem("institution_id");
  const { data, error } = await supaClient
    .from("institution")
    .select("institution_name")
    .eq("institution_id", +institutionId);
  if (error) {
    console.error("Error fetching student name:", error);
    return null;
  }
  if (data && data.length > 0) {
    sessionStorage.setItem("institution_name", data[0].institution_name);
    return data[0].institution_name;
  }
}



export function isInstitutionSchool() {
  console.log("institutionName", sessionStorage.getItem("institution_name"));
  
  if(sessionStorage.getItem("institution_name")){
    const institutionName = sessionStorage.getItem("institution_name");
    const institutionId = sessionStorage.getItem("institution_id");
    if (
      (institutionName && institutionName.toLowerCase().includes("school") || institutionName.toLowerCase().includes("college")) // Replace with actual school institution ID if known
    ) {
    console.log("Institution is a school.");
    return true;
  } else {
    console.log("Institution is not a school.");
    return false;
  }
}
}
// console.log(isInstitutionSchool());
// document.addEventListener("DOMContentLoaded", () => {
// if (isInstitutionSchool()) {
//   const assignment = document.querySelector("#assignment a");
//   const project = document.querySelector("#project a");
//   assignment.textContent = "Homework";
//   project.textContent = "Actvities";
//   const course = document.querySelector("#course");
//   const courseName = document.querySelector(".course_name");
//   const courseHeader = document.querySelector(".schedule-title");
//   if (course) {
//     courseHeader.textContent = "Subject Managent";
//     courseName.textContent = "subject name";
//     course.textContent = "subject";
//   }
// }
// });


const confirmationModal = document.getElementById("confirmationModal");
const closeModal = document.getElementById("logout-closeModal");
const cancelButton = document.getElementById("logout-cancelButton");
const confirmButton = document.getElementById("logout-confirmButton");
confirmButton.addEventListener("click", logOut);
logOutButton.addEventListener("click", () => {
  confirmationModal.classList.add("active");
  confirmationModal.classList.add("open");
  confirmationModal.style.display = "block";
});

closeModal.addEventListener("click", () => {
  confirmationModal.classList.add("slideOut");
  setTimeout(() => {
    confirmationModal.classList.remove("active", "slideOut");
    confirmationModal.style.display = "none";
  }, 500); // Wait for the animation to complete (500ms)
});

cancelButton.addEventListener("click", () => {
  confirmationModal.classList.add("slideOut");
  setTimeout(() => {
    confirmationModal.classList.remove("open", "slideOut");
    confirmationModal.style.display = "none";
  }, 500); // Wait for the animation to complete (300ms)
});

window.addEventListener("click", (event) => {
  if (event.target === confirmationModal) {
    confirmationModal.classList.remove("open");
    // setTimeout(() => {
      confirmationModal.classList.remove("active");
      confirmationModal.style.display = "none";
    // }, 500); // Wait for the animation to complete (500ms)
  }
});
