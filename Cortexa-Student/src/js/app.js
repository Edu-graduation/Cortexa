
const { createClient } = supabase;
const supabaseProjectUrl = "https://nwwqsqkwmkkuunczucdm.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3FzcWt3bWtrdXVuY3p1Y2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzEyODIsImV4cCI6MjA2MjEwNzI4Mn0.EF6CGrpM3bjxBo4-ItU3S1BPjfVHdv2HnvoeAdfPZug";
export const supaClient = createClient(supabaseProjectUrl, supabaseKey);
const studentId = sessionStorage.getItem("studentId");

// const logOutButton = document.querySelector(".log-out");
// logOutButton.addEventListener("click", logOut);

function isUserLoggedIn() {
  if (!studentId && !window.location.href.includes("index.html")) {
    alert("sign in first");
    window.location.href = "../../../index.html"; // Redirect to the sign-in page
    return;
  }
}
isUserLoggedIn();
export async function getUserName(studentId) {
  console.log("studentId:", studentId);
  const { data, error } = await supaClient
    .from("student")
    .select("student_name")
    .eq("student_id", +studentId);
  if (error) {
    console.error("Error fetching student name:", error);
    return null;
  }
  if (data && data.length > 0) {
    // const name = data[0].student_name;
    // userName.textContent = name;
    return data[0].student_name;
  }
}
function logOut() {
  // const confirmation = confirm("Are you sure you want to log out!");
  // if (!confirmation) return;
  sessionStorage.removeItem("studentId");
  sessionStorage.removeItem("courseId");
  sessionStorage.removeItem("institution_id");
  sessionStorage.removeItem("institution_name");
  window.location.href = "../../../index.html";
}

export async function getInstitutionId(studentId) {
  const { data, error } = await supaClient
    .from("student")
    .select("institution_id")
    .eq("student_id", +studentId);

  if (error) {
    console.error("Error fetching institution_id:", error);
    return null;
  }
  if (data && data.length > 0) {
    const institutionId = data[0].institution_id;
    if (!sessionStorage.getItem("institution_id")) {
      sessionStorage.setItem("institution_id", institutionId);
    }
    return institutionId;
  } else {
    console.log("No data found for studentId:", studentId);
    return null;
  }
}
async function getInstitutionName() {
  // const institutionId = sessionStorage.getItem("institution_id");
  const institutionId = await getInstitutionId(studentId);
  console.log("institutionId:", institutionId);
  
  if(institutionId){
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
  
}
getInstitutionName().then((institutionName) => {
  if (institutionName) {
    console.log("Institution Name:", institutionName);
  } else {
    console.log("No institution name found for the given institution ID.");
  }
});
export function isInstitutionSchool() {
  if(sessionStorage.getItem("institution_name")){
  const institutionName = sessionStorage.getItem("institution_name");
  if (
    (institutionName && institutionName?.toLowerCase().includes("school") || institutionName.toLowerCase().includes("college")) // Replace with actual school institution ID if known
  ) {
    console.log("Institution is a school.");
    return true;
  } else {
    console.log("Institution is not a school.");
    return false;
  }
}
}
isInstitutionSchool();
const logOutButton = document.querySelector(".log-out");
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
