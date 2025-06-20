import { supaClient } from "./app.js";
const title = document.querySelector(".title");
const courseId = sessionStorage.getItem("courseId");
async function getCourseName() {
  const { data, error } = await supaClient
    .from("course")
    .select("course_name")
    .eq("course_id", courseId)
    .single();

  if (error) {
    console.error("Error fetching course name", error);
    return null;
  }
  if (data) {
    title.textContent = `${data.course_name} Quiz`;
  }
}
// async function getQuiz(courseId) {
//   const { data, error } = await supaClient
//     .from("quiz")
//     .select("*")
//     .eq("course_id", courseId);
//   if (error) {
//     console.error("Error fetching quiz", error);
//     return null;
//   }
//   if (data) {
//     console.log(data);
//   }
// }
getCourseName();

// getQuiz(courseId);
