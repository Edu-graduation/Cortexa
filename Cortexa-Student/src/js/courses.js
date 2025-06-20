import { supaClient } from "./app.js";

const institutionId = sessionStorage.getItem("institution_id");
const studentId = sessionStorage.getItem("studentId");
const courseModal = document.querySelector(".courses__modal");
const overlay = document.querySelector(".overlay");
const coursesContainer = document.querySelector(".courses__container");

async function getInstructorInstitution() {
  const { data, error } = await supaClient
    .from("instructor_institution")
    .select("*")
    .eq("institution_id", institutionId);

  if (error) {
    console.error("Error fetching institution data:", error);
    return null;
  }

  const instructorsId = data.map((instructor) => instructor.instructor_id);
  return instructorsId;
}

async function getInstructorsMap() {
  const instructorsId = await getInstructorInstitution();

  const { data, error } = await supaClient
    .from("instructor")
    .select("*")
    .in("instructor_id", instructorsId);

  if (error) {
    console.error("Error fetching instructors data:", error);
    return null;
  }

  // Create a map of instructor_id to instructor_name
  const instructorsMap = {};
  data.forEach((instructor) => {
    instructorsMap[instructor.instructor_id] = instructor.instructor_name;
  });

  return instructorsMap;
}

async function getStudentCourses() {
  const instructorsId = await getInstructorInstitution();

  const { data, error } = await supaClient
    .from("enrollment")
    .select("*")
    .in("instructor_id", instructorsId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Error fetching enrollment data:", error);
    return null;
  }

  // Get unique course IDs while preserving the instructor association
  const courseInstructorMap = {};

  data.forEach((enrollment) => {
    const courseId = enrollment.course_id;
    const instructorId = enrollment.instructor_id;

    if (!courseInstructorMap[courseId]) {
      courseInstructorMap[courseId] = [];
    }

    // Add instructor to the course if not already added
    if (!courseInstructorMap[courseId].includes(instructorId)) {
      courseInstructorMap[courseId].push(instructorId);
    }
  });
  return courseInstructorMap;
}

function getCourseImage(courseName) {
  const imageMap = {
    Programming: "src/images/Courses/Vector (1).svg",
    Database: "src/images/Courses/Vector (2).svg",
    MOT: "src/images/Courses/Vector (2).svg",
    "Java 1": "src/images/Courses/Vector (1).svg",
    Production: "src/images/Courses/Clip path group.svg",
    "SA&D": "src/images/Courses/Vector (3).svg",
    "Statistics Programs": "src/images/Courses/Clip path group (1).svg",
    "Critical Thinking": "src/images/Courses/brain2.svg",
    ITI: "src/images/Courses/iti.svg",
    QBA: "src/images/Courses/qa.svg",
    OOP: "src/images/Courses/oop.svg",
    "Cost Accounting": "src/images/Courses/Cost acc.svg",
    Entrepreneurship: "src/images/Courses/Entrepreneurship.svg",
    IDSS: "src/images/Courses/ai.png",
    AIS: "src/images/Courses/cloud.png",
    Tourism: "src/images/Courses/TOURISM.png",
    ECommerce: "src/images/Courses/ECOMMERCE.png",
    IIS: "src/images/Courses/erp.png",
  };

  const path = imageMap[courseName] || "./images/Courses/brain2.svg";
  return encodeURI(path);
}
async function renderCourses() {
  coursesContainer.innerHTML =
    '<div class="loading-spinner" style="grid-column: span 2; margin-top:10rem; width:8rem; height:8rem"></div>';
  const courseInstructorMap = await getStudentCourses();
  const instructorsMap = await getInstructorsMap();

  if (!courseInstructorMap || !instructorsMap) {
    console.error("Failed to fetch necessary data");
    return;
  }

  const courseIds = Object.keys(courseInstructorMap);
  const { data, error } = await supaClient
    .from("course")
    .select("*")
    .in("course_id", courseIds);

  if (error) {
    console.error("Error fetching course data:", error);
    return;
  }
  let markup = "";
  data.forEach((course, index) => {
    const imageSrc = getCourseImage(course.course_name);

    // Get all instructors for this course
    const courseInstructorIds = courseInstructorMap[course.course_id] || [];
    const instructorNames = courseInstructorIds.map(
      (id) => instructorsMap[id] || "Unknown Instructor"
    );
    // Display all instructor names in a single paragraph with line breaks
    const instructorNamesHtml = instructorNames.join("<br>");

    markup += `<div class="course course-${index + 1}" data-course-id="${
      course.course_id
    }">
                <h3 class="course__name">${course.course_name}</h3>
                <p class="course__desription">${course.course_description}</p>
                <p class="course__proffesor__name">${instructorNamesHtml}</p>
                <div class="course__icon-box">
                <img src="${imageSrc}" alt="${
      course.course_name
    } icon" class="course__icon" onerror="this.onerror=null; this.src='src/images/Courses/ai.png';">
                </div>
              </div>
              <div class="line-sprator"></div>`;
  });
  coursesContainer.innerHTML = markup;
}

renderCourses()
  .then(() => {
    const coursesEl = document.querySelectorAll(".course");

    coursesEl.forEach((coursesEl) => {
      coursesEl.addEventListener("click", (e) => {
        const courseId = e.target.closest(".course").dataset.courseId;
        sessionStorage.setItem("courseId", courseId);
        showCourseModal();
      });
    });
  })
  .catch((err) => {
    console.error("Error rendering courses:", err);
  });
function showCourseModal() {
  courseModal.classList.remove("modal-hidden");
  courseModal.classList.add("modal-show");
  overlay.style.display = "block";
}
