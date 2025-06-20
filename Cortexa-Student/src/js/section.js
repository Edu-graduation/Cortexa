import { supaClient } from "./app.js";
const instructorName = document.getElementById("instructorName");
async function getInstructorName() {
  const { data, error } = await supaClient
    .from("enrollment")
    .select("*")
    .eq("course_id", sessionStorage.getItem("courseId"))
    .eq("student_id", sessionStorage.getItem("studentId"));
  if (error) {
    console.error("Error fetching student:", error);
    return null;
  }
  if (data) {
    const instructorId = data[0].instructor_id;
    const { data: instructorData, error: instructorError } = await supaClient
      .from("instructor")
      .select("instructor_name")
      .eq("instructor_id", instructorId);
    if (instructorError) {
      console.error("Error fetching instructor:", instructorError);
      return null;
    }
    if (instructorData) {
      instructorName.textContent = instructorData[0].instructor_name;
      return instructorData[0].instructor_name;
    }
  }
}

getInstructorName();
