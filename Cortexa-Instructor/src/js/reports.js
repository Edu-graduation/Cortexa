
import { isInstitutionSchool } from "./main.js";
import { supaClient } from "./main.js";
// Mock current instructor ID (in a real app, this would come from authentication)
const instructorId = JSON.parse(sessionStorage.getItem("instructorId"));
const instututionId = JSON.parse(sessionStorage.getItem("institution_id"));
window.exportChartData = exportChartData;
window.printChart = printChart;
window.exportChartAsImage = exportChartAsImage;

// Chart colors from CSS variables
const chartColors = {
  primary: "#5955b3",
  primaryLight: "#5a47ff",
  primaryDark: "#4d49a1",
  dayColors: [
    "#e3dbf4", // day-color-1
    "#fae3d4", // day-color-2
    "#bbeff4", // day-color-3
    "#dff7e3", // day-color-4
    "#ffebc7", // day-color-5
    "#fdffaa", // day-color-6
    "#e8c07b", // day-color-7
  ],
  dayTextColors: [
    "#7159a2", // day-color-text-1
    "#e0a855", // day-color-text-2
    "#63d8e2", // day-color-text-3
    "rgb(117, 161, 117)", // day-color-text-4
    "#ebc353", // day-color-text-5
    "#cbcd4c", // day-color-text-6
    "#daa74e", // day-color-text-7
  ],
};

// Chart instances
const charts = {};

// Common chart options
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        font: {
          family: "'Poppins', sans-serif",
          size: 12,
        },
        padding: 15,
      },
    },
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      titleColor: chartColors.primary,
      bodyColor: "#333",
      borderColor: "#ddd",
      borderWidth: 1,
      padding: 10,
      titleFont: {
        family: "'Poppins', sans-serif",
        size: 14,
        weight: "bold",
      },
      bodyFont: {
        family: "'Poppins', sans-serif",
        size: 13,
      },
      cornerRadius: 6,
    },
  },
};

// Show loading indicator
function showLoading(elementId) {
  const loadingElement = document.getElementById(`${elementId}Loading`);

  if (loadingElement) {
    loadingElement.style.display = "flex";
  }
}

// Hide loading indicator
function hideLoading(elementId) {
  const loadingElement = document.getElementById(`${elementId}Loading`);
  if (loadingElement) {
    loadingElement.style.display = "none";
  }
}

// Display error message
function showError(elementId, message) {
  const container = document.getElementById(elementId).parentElement;
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message || "Failed to load data";
  container.appendChild(errorDiv);
  hideLoading(elementId);
}

async function initializeReports() {
  try {
    // Show loading indicators for all charts
    showLoading("coursePerformanceChart");
    showLoading("studentEngagementChart");
    showLoading("assignmentCompletionChart");
    showLoading("quizPerformanceChart");
    showLoading("studentProgressChart");
    showLoading("activityParticipationChart");
    showLoading("CGPADistributionChart"); // We'll keep using this element ID but change the chart type
    showLoading("atRiskStudents");

    // Fetch all necessary data for the instructor
    const [
      instructorData,
      instructorCourses,
      studentsData,
      enrollmentData,
      assignmentsData,
      studentAssignmentData,
      quizzesData,
      studentQuizData,
      activitiesData,
      courseActivityData,
      studentActivityData,
      sessionsData,
    ] = await Promise.all([
      fetchInstructorData(instructorId),
      fetchInstructorCourses(instructorId),
      fetchStudents(),
      fetchEnrollments(instructorId),
      fetchInstructorAssignments(instructorId),
      fetchStudentAssignments(),
      fetchInstructorQuizzes(instructorId),
      fetchStudentQuizzes(),
      fetchInstructorActivities(instructorId),
      fetchCourseActivities(),
      fetchStudentActivities(),
      fetchInstructorSessions(instructorId),
    ]);

    // Populate course filter
    populateCourseFilter(instructorCourses);

    // Update summary cards
    updateSummaryCards(
      instructorCourses,
      studentsData,
      enrollmentData,
      assignmentsData,
      studentAssignmentData
    );

    // Initialize each chart
    initCoursePerformanceChart(
      instructorCourses,
      enrollmentData,
      studentAssignmentData,
      studentQuizData,
      assignmentsData,
      quizzesData
    );

    initStudentEngagementChart(
      instructorCourses,
      enrollmentData,
      studentActivityData,
      studentAssignmentData,
      studentQuizData,
      assignmentsData,
      quizzesData,
      sessionsData
    );

    initAssignmentCompletionChart(
      assignmentsData,
      studentAssignmentData,
      instructorCourses,
      studentsData
    );

    initQuizPerformanceChart(quizzesData, studentQuizData, instructorCourses);

    // initStudentProgressChart(
    //   instructorCourses,
    //   enrollmentData,
    //   studentAssignmentData,
    //   studentQuizData,
    //   assignmentsData,
    //   quizzesData,
    //   studentsData
    // );

    initActivityParticipationChart(
      activitiesData,
      studentActivityData,
      instructorCourses,
      courseActivityData
    );

    // CHANGE: Replace Performance Trend Chart with CGPA Distribution Chart
    // This now uses the student.cgpa value directly from the studentsData
    initCGPADistributionChart(studentsData, enrollmentData);

    // Initialize at-risk students table
    initAtRiskStudentsTable(
      studentsData,
      instructorCourses,
      enrollmentData,
      assignmentsData,
      studentAssignmentData,
      quizzesData,
      studentQuizData,
      studentActivityData
    );
  } catch (error) {
    console.error("Error initializing reports:", error);
  }
}
// Fetch data functions
async function fetchInstructorData(instructorId) {
  const { data, error } = await supaClient
    .from("instructor")
    .select("*")
    .eq("instructor_id", instructorId)
    .single();

  if (error) throw error;
  return data;
}

async function fetchInstructorCourses(instructorId) {
  // Get courses through enrollment table where instructor teaches
  const { data, error } = await supaClient
    .from("enrollment")
    .select(
      `
      course_id,
      course:course_id (*)
    `
    )
    .eq("instructor_id", instructorId);
  if (error) throw error;

  // Extract unique courses
  const uniqueCourses = [];
  const courseIds = new Set();

  data.forEach((item) => {
    if (!courseIds.has(item.course_id)) {
      courseIds.add(item.course_id);
      uniqueCourses.push(item.course);
    }
  });

  return uniqueCourses;
}

async function fetchStudents() {
  const enrolledStudents = await fetchEnrollments(instructorId);
  const studentIds = enrolledStudents.map((student) => student.student_id);
  const { data, error } = await supaClient
    .from("student")
    .select("*")
    .in("student_id", studentIds);
  if (error) throw error;
  return data;
}

async function fetchEnrollments(instructorId) {
  const { data, error } = await supaClient
    .from("enrollment")
    .select("*")
    .eq("instructor_id", instructorId);
  if (error) throw error;
  return data;
}

async function fetchInstructorAssignments(instructorId) {
  const { data, error } = await supaClient
    .from("assignment")
    .select("*")
    .eq("instructor_id", instructorId);
  if (error) throw error;
  return data;
}

async function fetchStudentAssignments() {
  const enrolledStudents = await fetchEnrollments(instructorId);
  const studentIds = enrolledStudents.map((student) => student.student_id);
  const { data, error } = await supaClient
    .from("student_assignment")
    .select("*")
    .in("student_id", studentIds);
  if (error) throw error;
  return data;
}

async function fetchInstructorQuizzes(instructorId) {
  const { data, error } = await supaClient
    .from("quiz")
    .select("*")
    .eq("instructor_id", instructorId);

  if (error) throw error;
  return data;
}

async function fetchStudentQuizzes() {
  const enrolledStudents = await fetchEnrollments(instructorId);
  const studentIds = enrolledStudents.map((student) => student.student_id);
  const courseIds = enrolledStudents.map((student) => student.course_id);
  const courseQuizzes = await fetchCourseQuizzes(courseIds);
  const quizIds = courseQuizzes.map((quiz) => quiz.quiz_id);
  const { data, error } = await supaClient
    .from("student_quiz")
    .select("*")
    .in("student_id", studentIds)
    .in("quiz_id", quizIds);
  if (error) throw error;
  if(data){

    return data;
  }
}

async function fetchInstructorActivities(instructorId) {
  const { data, error } = await supaClient.from("activity").select("*").eq("instructor_id",instructorId);
  if (error) throw error;
  return data;
}

async function fetchCourseActivities() {
  const { data, error } = await supaClient.from("course_activity").select("*");

  if (error) throw error;
  return data;
}

async function fetchStudentActivities() {
  const enrolledStudents = await fetchEnrollments(instructorId);
  const studentIds = enrolledStudents.map((student) => student.student_id);
  const { data, error } = await supaClient
    .from("student_activity")
    .select("*")
    .in("student_id", studentIds);
  if (error) throw error;
  return data;
}
async function fetchCourseQuizzes(courseId) {
  const { data, error } = await supaClient
    .from("quiz")
    .select("*")
    .in("course_id", courseId);
  if (error) throw error;
  console.log(data);
  
  return data;
}

async function fetchInstructorSessions(instructorId) {
  // Since sessions are linked to courses, we need to get the instructor's courses first
  const instructorCourses = await fetchInstructorCourses(instructorId);
  const courseIds = instructorCourses.map((course) => course.course_id);

  // Then get sessions for those courses
  const { data, error } = await supaClient
    .from("session")
    .select("*")
    .in("course_id", courseIds);

  if (error) throw error;
  return data;
}
// function initStudentEngagementChart(courses, enrollments, studentActivities) {
//   try {
//     // Get course IDs taught by the instructor
//     const instructorCourseIds = courses.map((course) => course.course_id);
    
//     // Get students enrolled in instructor's courses
//     const enrolledStudentIds = enrollments.map((e) => e.student_id);
    
//     // Remove duplicates
//     const uniqueStudentIds = [...new Set(enrolledStudentIds)];
    
//     // Calculate engagement levels
//     const engagementLevels = {
//       High: 0,
//       Medium: 0,
//       Low: 0,
//       Inactive: 0,
//     };

//     // Process student engagement considering team activities
//     uniqueStudentIds.forEach((studentId) => {
//       // Get all activities this student participated in
//       const studentActivityEntries = studentActivities.filter(
//         (sa) => sa.student_id === studentId
//       );
      
//       // Count unique activities (by activity_id) to avoid double-counting team activities
//       // This assumes each activity has a unique activity_id even if multiple students participate
//       const uniqueActivityIds = new Set(
//         studentActivityEntries.map((activity) => activity.activity_id)
//       );
      
//       const engagementCount = uniqueActivityIds.size;      
//       // Categorize engagement level based on unique activities
//       if (engagementCount >= 5) {
//         engagementLevels["High"]++;
//       } else if (engagementCount >= 3) {
//         engagementLevels["Medium"]++;
//       } else if (engagementCount >= 1) {
//         engagementLevels["Low"]++;
//       } else {
//         engagementLevels["Inactive"]++;
//       }
//     });
    
//     // Prepare data for chart
//     const labels = Object.keys(engagementLevels);
//     const data = Object.values(engagementLevels);
        
//     // Create chart
//     const ctx = document
//       .getElementById("studentEngagementChart")
//       .getContext("2d");
//     charts.studentEngagement = new Chart(ctx, {
//       type: "doughnut",
//       data: {
//         labels: labels,
//         datasets: [
//           {
//             data: data,
//             backgroundColor: [
//               chartColors.dayColors[3], // High
//               chartColors.dayColors[4], // Medium
//               chartColors.dayColors[5], // Low
//               chartColors.dayColors[6], // Inactive
//             ],
//             borderColor: [
//               chartColors.dayTextColors[3],
//               chartColors.dayTextColors[4],
//               chartColors.dayTextColors[5],
//               chartColors.dayTextColors[6],
//             ],
//             borderWidth: 1,
//           },
//         ],
//       },
//       options: {
//         ...commonChartOptions,
//         plugins: {
//           ...commonChartOptions.plugins,
//           tooltip: {
//             callbacks: {
//               label: (context) => {
//                 const total = context.dataset.data.reduce((a, b) => a + b, 0);
//                 const percentage = ((context.raw / total) * 100).toFixed(1);
//                 return `${context.label}: ${context.raw} students (${percentage}%)`;
//               },
//             },
//           },
//         },
//       },
//     });
    
//     hideLoading("studentEngagementChart");
//   } catch (error) {
//     console.error("Error initializing student engagement chart:", error);
//     showError(
//       "studentEngagementChart",
//       "Failed to load student engagement data"
//     );
//   }
// }
function initStudentEngagementChart(
  courses,
  enrollments,
  studentActivities,
  studentAssignments,
  studentQuizzes,
  assignments,
  quizzes,
  sessions
) {
  try {
    // Get course IDs taught by the instructor
    const instructorCourseIds = courses.map((course) => course.course_id);
    
    // Get students enrolled in instructor's courses
    const enrolledStudentIds = enrollments.map((e) => e.student_id);
    
    // Remove duplicates
    const uniqueStudentIds = [...new Set(enrolledStudentIds)];

    // Calculate total available activities, assignments, and quizzes
    const totalActivities = new Set(studentActivities.map(a => a.activity_id)).size;
    const totalAssignments = assignments.length;
    const totalQuizzes = quizzes.length;
    
    // Prepare engagement metrics
    const engagementMetrics = {
      High: 0,
      Medium: 0,
      Low: 0,
      Inactive: 0,
    };
    

    // Process each student's engagement using multiple factors
    uniqueStudentIds.forEach((studentId) => {
      // Calculate activity engagement score (0-100%)
      const studentActivityEntries = studentActivities.filter(
        (sa) => sa.student_id === studentId
      );
      const uniqueActivityIds = new Set(
        studentActivityEntries.map((activity) => activity.activity_id)
      );
      const activityScore = totalActivities > 0 
        ? (uniqueActivityIds.size / totalActivities) * 100 
        : 0;
      
      // Calculate assignment completion score (0-100%)
      const completedAssignments = studentAssignments.filter(
        (sa) => sa.student_id === studentId && sa.assign_path
      ).length;
      const assignmentScore = totalAssignments > 0 
        ? (completedAssignments / totalAssignments) * 100 
        : 0;
      
      
      
      // Calculate quiz participation score (0-100%)
      const attemptedQuizzes = studentQuizzes.filter(
        (sq) => sq.student_id === studentId
      ).length;
      const quizScore = totalQuizzes > 0 
        ? (attemptedQuizzes / totalQuizzes) * 100 
        : 0;
      // Calculate weighted engagement score (customize weights as needed)
      const weights = {
        activity: 0.4,   // 40% weight for activities
        assignment: 0.3, // 30% weight for assignments
        quiz: 0.3        // 30% weight for quizzes
      };
      
      const totalEngagementScore = 
        (activityScore * weights.activity) +
        (assignmentScore * weights.assignment) +
        (quizScore * weights.quiz);
        
      // Categorize based on overall engagement score
      if (totalEngagementScore >= 75) {
        engagementMetrics.High++;
      } else if (totalEngagementScore >= 50) {
        engagementMetrics.Medium++;
      } else if (totalEngagementScore >= 25) {
        engagementMetrics.Low++;
      } else {
        engagementMetrics.Inactive++;
      }
    });
    console.log(engagementMetrics);

    // Prepare data for chart
    const labels = Object.keys(engagementMetrics);
    const data = Object.values(engagementMetrics);// Create chart
    console.log(data);
    
    const ctx = document
      .getElementById("studentEngagementChart")
      .getContext("2d");
    charts.studentEngagement = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              chartColors.dayColors[3], // High
              chartColors.dayColors[4], // Medium
              chartColors.dayColors[5], // Low
              chartColors.dayColors[6], // Inactive
            ],
            borderColor: [
              chartColors.dayTextColors[3],
              chartColors.dayTextColors[4],
              chartColors.dayTextColors[5],
              chartColors.dayTextColors[6],
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonChartOptions,
        plugins: {
          ...commonChartOptions.plugins,
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${context.raw} students (${percentage}%)`;
              },
            },
          },
        },
      },
    });
    
    hideLoading("studentEngagementChart");
  } catch (error) {
    console.error("Error initializing student engagement chart:", error);
    showError(
      "studentEngagementChart",
      "Failed to load student engagement data"
    );
  }
}
// Populate course filter
function populateCourseFilter(courses) {
  const filter = document.getElementById("courseFilter");
  filter.innerHTML =
    '<option class="filter-label" value="all">All My Courses</option>';

  courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.course_id;
    option.textContent = course.course_name;
    filter.appendChild(option);
  });
}
function initCGPADistributionChart(studentsData, enrollmentData) {
  try {
    // Define CGPA ranges and colors
    const cgpaRanges = [
      { range: "3.5-4.0", label: "Excellent", color: "#4CAF50" },
      { range: "3.0-3.49", label: "Very Good", color: "#8BC34A" },
      { range: "2.5-2.99", label: "Good", color: "#FFC107" },
      { range: "2.0-2.49", label: "Average", color: "#FF9800" },
      { range: "Below 2.0", label: "Below Average", color: "#FF5722" },
    ];

    // Initialize counters for each CGPA range
    let cgpaDistribution = {};
    cgpaRanges.forEach((range) => {
      cgpaDistribution[range.range] = 0;
    });

    // Get enrolled students for this instructor
    const enrolledStudentIds = new Set();
    enrollmentData.forEach((enrollment) => {
      enrolledStudentIds.add(enrollment.student_id);
    });
    // Count students in each CGPA range
    let totalStudents = 0;

    studentsData.forEach((student) => {
      // Only include students enrolled in the instructor's courses
      if (
        enrolledStudentIds.has(student.student_id) &&
        student.student_cgpa !== undefined &&
        student.student_cgpa !== null
      ) {
        const cgpaCategory = categorizeCGPA(student.student_cgpa);
        cgpaDistribution[cgpaCategory]++;
        totalStudents++;
      }
    });

    // If there's no real data, use mock data for demonstration
    if (totalStudents === 0) {
      cgpaDistribution = {
        "3.5-4.0": 35,
        "3.0-3.49": 25,
        "2.5-2.99": 20,
        "2.0-2.49": 15,
        "Below 2.0": 5,
      };
      totalStudents = 100;
    }

    // Calculate percentages
    const labels = [];
    const data = [];
    const backgroundColor = [];

    cgpaRanges.forEach((range) => {
      const count = cgpaDistribution[range.range];
      const percentage =
        totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

      labels.push(`${range.range} (${range.label})`);
      data.push(percentage);
      backgroundColor.push(range.color);
    });

    // Get canvas context
    const ctx = document
      .getElementById("CGPADistributionChart")
      .getContext("2d");

    // Create pie chart
    charts.CGPADistribution = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColor,
            borderColor: "#ffffff",
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonChartOptions,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
              padding: 15,
            },
          },
          title: {
            display: true,
            // text: "CGPA Distribution",
            font: {
              family: "'Poppins', sans-serif",
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                return `${label}: ${value}%`;
              },
            },
          },
        },
      },
      // options: {
      //   ...commonChartOptions,
      //   scales: {
      //     y: {
      //       type: 'linear', // Still linear but with steps to look discrete
      //       beginAtZero: true,
      //       ticks: {
      //         stepSize: 1  // Ensures ticks are spaced at 1 unit intervals (or change as needed)
      //       },
      //       title: {
      //         display: true,
      //         text: 'Enrollment Count'
      //       }
      //     },
      //     y1: {
      //       beginAtZero: true,
      //       max: 100,
      //       title: {
      //         display: true,
      //         text: "Percentage (%)",
      //         font: {
      //           family: "'Poppins', sans-serif",
      //           size: 12,
      //         },
      //       },
      //       position: "right",
      //       grid: {
      //         drawOnChartArea: false,
      //       },
      //     },
      //   },
      // },
    });

    // Hide loading spinner
    hideLoading("CGPADistributionChart");
  } catch (error) {
    console.error("Error initializing CGPA distribution chart:", error);
    showError("CGPADistributionChart", "Failed to load CGPA distribution data");
  }
}
// Function to categorize CGPA into ranges
function categorizeCGPA(cgpa) {
  if (cgpa >= 3.5) return "3.5-4.0";
  if (cgpa >= 3.0) return "3.0-3.49";
  if (cgpa >= 2.5) return "2.5-2.99";
  if (cgpa >= 2.0) return "2.0-2.49";
  return "Below 2.0";
}
// Update summary cards
// function updateSummaryCards(
//   courses,
//   students,
//   enrollments,
//   assignments,
//   studentAssignments
// ) {
//   // Get course IDs taught by the instructor
//   const instructorCourseIds = courses.map((course) => course.course_id);
//   // Count unique students enrolled in instructor's courses
//   //   const enrolledStudents = new Set()
//   //   enrollments.forEach((enrollment) => {
//   //     enrolledStudents.add(enrollment.student_id)
//   //   })
//   // console.log(enrolledStudents);
//   // Count active courses (courses with at least one enrolled student)
//   const activeCourses = new Set();
//   enrollments.forEach((enrollment) => {
//     activeCourses.add(enrollment.course_id);
//   });

//   const enrolledStudentIds = [...new Set(enrollments.map((e) => e.student_id))];

//   // Count pending submissions (assignments without a submission path)
//   let pendingCount = 0;

//   assignments.forEach((assignment) => {
//     const assignmentId = assignment.assign_id;
//     const totalSubmissions = studentAssignments.filter(
//       (sa) => sa.assign_id === assignmentId
//     ).length;

//     const completedSubmissions = studentAssignments.filter(
//       (sa) => sa.assign_id === assignmentId && sa.assign_path
//     ).length;
//     pendingCount += totalSubmissions - completedSubmissions;
//     console.log(completedSubmissions);
//   });
  
//   console.log(pendingCount);
  
//   // Calculate average response time (mock data - in a real app, this would come from message timestamps)
//   // const avgResponseTime = "8.5 hours"

//   // Update the summary cards

//   document.getElementById("totalStudents").textContent = enrollments.length;
//   document.getElementById("activeCourses").textContent = activeCourses.size;
//   document.getElementById("pendingSubmissions").textContent = pendingCount;
//   // document.getElementById("avgResponseTime").textContent = avgResponseTime
// }
function updateSummaryCards(
  courses,
  students,
  enrollments,
  assignments,
  studentAssignments
) {
  // Get course IDs taught by the instructor
  const instructorCourseIds = courses.map((course) => course.course_id);

  // Count unique students enrolled in instructor's courses
  const enrolledStudentIds = [...new Set(enrollments.map((e) => e.student_id))];

  // Count active courses (courses with at least one enrolled student)
  const activeCourses = new Set();
  enrollments.forEach((enrollment) => {
    activeCourses.add(enrollment.course_id);
  });

  // Calculate pending submissions correctly
  let pendingCount = 0;

  // Loop through each assignment
  assignments.forEach((assignment) => {
    const assignmentId = assignment.assign_id;
    const courseId = assignment.course_id;
    
    // Find all students enrolled in this assignment's course
    const studentsInCourse = enrollments.filter(
      (enrollment) => enrollment.course_id === courseId
    ).map((enrollment) => enrollment.student_id);

    // Count completed submissions for this assignment
    const completedSubmissions = studentAssignments.filter(
      (sa) => sa.assign_id === assignmentId && sa.assign_path
    );
    
    // Get unique student IDs who have completed this assignment
    const completedStudentIds = [...new Set(completedSubmissions.map(
      (submission) => submission.student_id
    ))];

    // Each enrolled student who hasn't completed is a pending submission
    const pendingForThisAssignment = studentsInCourse.length - completedStudentIds.length;
    
    pendingCount += pendingForThisAssignment;
  });

  // Update the summary cards
  document.getElementById("totalStudents").textContent = enrolledStudentIds.length;
  document.getElementById("activeCourses").textContent = activeCourses.size;
  document.getElementById("pendingSubmissions").textContent = pendingCount;
}
// 1. Course Performance Chart
function initCoursePerformanceChart(
  courses,
  enrollments,
  studentAssignments,
  studentQuizzes,
  assignments,
  quizzes,
) {
  try {
    // Calculate metrics for each course
    const courseIds = courses.map((course) => course.course_id);
      
    const courseMetrics = courses.map((course) => {
      const courseId = course.course_id;

      // Calculate enrollment count
      const enrollmentCount = enrollments.filter(
        (e) => e.course_id === courseId
      ).length;

      // Calculate assignment completion rate
      const courseAssignments = assignments.filter(
        (a) => a.course_id === courseId
      );
      const courseAssignmentIds = courseAssignments.map((a) => a.assign_id);
      const courseAssignmentSubmissions = studentAssignments.filter((sa) =>
        courseAssignmentIds.includes(sa.assign_id)
      );

      const completedAssignments = courseAssignmentSubmissions.filter(
        (sa) => sa.assign_path !== null
      ).length;
const enrollmentsInCourse = enrollments.filter(
  (e) => e.course_id === courseId
).length;

const totalExpectedSubmissions = enrollmentsInCourse * courseAssignments.length;

const assignmentCompletionRate =
  totalExpectedSubmissions > 0
    ? (completedAssignments / totalExpectedSubmissions) * 100
    : 0;
      // Calculate average quiz score

      // const courseQuizzes = quizzes.filter((q) =>
      //   courseIds.includes(q.course_id)
      // );
      const courseQuizzes = quizzes.filter((q) => q.course_id === courseId);
      // const courseQuizIds = courseQuizzes.map((q) => q.quiz_id);

      // const courseQuizSubmissions = studentQuizzes.filter((sq) =>
      //   courseQuizIds.includes(sq.quiz_id)
      // );

      // const totalScore = courseQuizSubmissions.reduce(
      //   (sum, sq) => sum + Number(sq.score),
      //   0
      // );

      // const avgQuizScore =
      //   courseQuizSubmissions.length > 0
      //     ? totalScore / courseQuizSubmissions.length
      //     : 0;
      const courseQuizIds = courseQuizzes.map((q) => q.quiz_id);
const courseQuizSubmissions = studentQuizzes.filter((sq) =>
  courseQuizIds.includes(sq.quiz_id)
);
const totalScore = courseQuizSubmissions.reduce(
  (sum, sq) => sum + Number(sq.score),
  0
);
console.log(totalScore);

const avgQuizScore =
  courseQuizSubmissions.length > 0
    ? totalScore / courseQuizSubmissions.length
    : 0;
    console.log(courseQuizSubmissions.length);
    
    console.log(avgQuizScore);
    
      return {
        name: course.course_name,
        enrollmentCount,
        assignmentCompletionRate: Number.parseFloat(
          assignmentCompletionRate.toFixed(1)
        ),
        avgQuizScore: Number.parseFloat(avgQuizScore.toFixed(1)),
      };
    });

    // Prepare data for chart
    const courseNames = courseMetrics.map((cm) => cm.name);
    const enrollmentData = courseMetrics.map((cm) => cm.enrollmentCount);

    const completionRateData = courseMetrics.map(
      (cm) => cm.assignmentCompletionRate
    );

    const quizScoreData = courseMetrics.map((cm) => cm.avgQuizScore);

    // Create chart
    const ctx = document
      .getElementById("coursePerformanceChart")
      .getContext("2d");
    charts.coursePerformance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: courseNames,
        datasets: [
          {
            label: "Enrollment Count",
            data: enrollmentData,
            backgroundColor: chartColors.dayColors[0],
            borderColor: chartColors.dayTextColors[0],
            borderWidth: 1,
            yAxisID: "y",
          },
          {
            label: `${isInstitutionSchool() ? 'Homework' : 'Assignment'} Completion Rate (%)`,
            data: completionRateData,
            backgroundColor: chartColors.dayColors[1],
            borderColor: chartColors.dayTextColors[1],
            borderWidth: 1,
            yAxisID: "y1",
          },
          {
            label: "Avg. Quiz Score",
            data: quizScoreData,
            backgroundColor: chartColors.dayColors[2],
            borderColor: chartColors.dayTextColors[2],
            borderWidth: 1,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        ...commonChartOptions,
        scales: {
          y: {
            type: "linear", // Still linear but with steps to look discrete
            beginAtZero: true,
            ticks: {
              stepSize: 1, // Ensures ticks are spaced at 1 unit intervals (or change as needed)
            },
            title: {
              display: true,
              text: "Enrollment Count",
            },
          },
          y1: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: `${isInstitutionSchool() ? 'Homework': 'Assignment'} Completion Rate`,
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
            },
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });

    hideLoading("coursePerformanceChart");
  } catch (error) {
    console.error("Error initializing course performance chart:", error);
    showError(
      "coursePerformanceChart",
      "Failed to load course performance data"
    );
  }
}
// 3. Assignment Completion Chart
function initAssignmentCompletionChart(
  assignments,
  studentAssignments,
  courses,
  students
) {
  try {
    // Calculate completion rates by assignment
    // let comp= 0 ;

    const assignmentData = assignments.map((assignment) => {
      const assignmentId = assignment.assign_id;
      const courseId = assignment.course_id;
      const course = courses.find((c) => c.course_id === courseId);


      // Get all submissions for this assignment
      const submissions = studentAssignments.filter(
        (sa) => sa.assign_id === assignmentId
      );
      const completedSubmissions = submissions.filter(
        (sa) => sa.assign_path !== null
      ).length;
      
      
      
      const completionRate =
        submissions.length > 0
          ? (completedSubmissions /students.length) * 100
          : 0;
      //     const assignmentsId = assignments.map((assignment) => assignment.assign_id);

      //     const compRate = (studentAssignments.filter((sa) => assignmentsId.includes(sa.assign_id)).length/10)*100;
      // comp += completionRate;

      return {
        name: assignment.assign_title,
        course: course ? course.course_name : "Unknown Course",
        completionRate: Number.parseFloat(completionRate.toFixed(1)),
        // completionRate: Number.parseFloat(compRate.toFixed(1)),
        // completionRate: comp,
        dueDate: assignment.assign_duedate,
      };
    });

    // Sort by due date (most recent first)
    assignmentData.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    // Take only the 5 most recent assignments
    const recentAssignments = assignmentData.slice(0, 20);

    // Prepare data for chart
    const assignmentNames = recentAssignments.map((a) => a.name);
    const completionRates = recentAssignments.map((a) => a.completionRate);
    const incompletionRates = recentAssignments.map(
      (a) => 100 - a.completionRate
    );

    // Create chart
    const ctx = document
      .getElementById("assignmentCompletionChart")
      .getContext("2d");
    charts.assignmentCompletion = new Chart(ctx, {
      type: "bar",
      data: {
        labels:isInstitutionSchool() ? assignmentNames.map((a) => a.replaceAll("Assignment", "Homework")) : assignmentNames,
        datasets: [
          {
            label: "Completed",
            data: completionRates,
            backgroundColor: chartColors.dayColors[3],
            borderColor: chartColors.dayTextColors[3],
            borderWidth: 1,
          },
          {
            label: "Incomplete",
            data: incompletionRates,
            backgroundColor: chartColors.dayColors[6],
            borderColor: chartColors.dayTextColors[6],
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonChartOptions,
        indexAxis: "y",
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Completion Rate (%)",
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
            },
          },
          y: {
            stacked: true,
          },
        },
      },
    });

    hideLoading("assignmentCompletionChart");
  } catch (error) {
    console.error("Error initializing assignment completion chart:", error);
    showError(
      "assignmentCompletionChart",
      "Failed to load assignment completion data"
    );
  }
}
// Fully modified initQuizPerformanceChart function
function initQuizPerformanceChart(quizzes, studentQuizzes, courses) {
  try {
    // Group quizzes by course
    const quizzesByCourse = {};
    courses.forEach((course) => {
      quizzesByCourse[course.course_id] = {
        name: course.course_name,
        quizzes: [],
      };
    });
    
    // Calculate average scores and student count for each quiz
    quizzes.forEach((quiz) => {
      const quizId = quiz.quiz_id;
      const courseId = quiz.course_id;
      
      if (quizzesByCourse[courseId]) {
        const submissions = studentQuizzes.filter(
          (sq) => sq.quiz_id === quizId
        );
        
        // Count students who attempted this quiz (non-empty student_answers)
        const studentsAttempted = submissions.filter(
          (sq) => sq.student_answers && sq.student_answers.trim() !== ''
        ).length;
        
        const totalScore = submissions.reduce(
          (sum, sq) => sum + Number(sq.score),
          0
        );
        const avgScore =
          submissions.length > 0 ? totalScore / submissions.length : 0;
        
        quizzesByCourse[courseId].quizzes.push({
          name: quiz.quiz_title, // Unique label
          avgScore: Number.parseFloat(avgScore.toFixed(1)),
          studentsAttempted: studentsAttempted
        });
      }
    });
    
    // Collect all unique quiz names
    const allQuizNamesSet = new Set();
    Object.values(quizzesByCourse).forEach((courseData) => {
      courseData.quizzes.forEach((quiz) => {
        allQuizNamesSet.add(quiz.name);
      });
    });
    
    const allQuizNames = Array.from(allQuizNamesSet).sort();
    
    // Prepare datasets for average scores
    const scoreDatasets = Object.values(quizzesByCourse)
      .filter((courseData) => courseData.quizzes.length > 0)
      .map((courseData, index) => {
        // Build a data array aligned with allQuizNames
        const scoreMap = {};
        courseData.quizzes.forEach((quiz) => {
          scoreMap[quiz.name] = quiz.avgScore;
        });
        
        const alignedData = allQuizNames.map((name) =>
          scoreMap.hasOwnProperty(name) ? scoreMap[name] : null
        );
        
        return {
          label: `${courseData.name} (Avg Score)`,
          data: alignedData,
          backgroundColor:
            chartColors.dayColors[index % chartColors.dayColors.length],
          borderColor:
            chartColors.dayTextColors[index % chartColors.dayTextColors.length],
          borderWidth: 2,
          fill: false,
          tension: 0.2,
          yAxisID: 'y',
        };
      });
    
    // Get colors for student count datasets (reuse dayColors with opacity)
    const getStudentCountColor = (index) => {
      const baseColor = chartColors.dayColors[index % chartColors.dayColors.length];
      // Convert to rgba with opacity if it's a hex color
      if (baseColor.startsWith('#')) {
        // Convert hex to rgb
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.6)`;
      }
      // If it's already rgba, adjust opacity
      return baseColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, 'rgba($1, $2, $3, 0.6)');
    };
    
    // Prepare datasets for student count
    const studentCountDatasets = Object.values(quizzesByCourse)
      .filter((courseData) => courseData.quizzes.length > 0)
      .map((courseData, index) => {
        // Build a data array aligned with allQuizNames
        const countMap = {};
        courseData.quizzes.forEach((quiz) => {
          countMap[quiz.name] = quiz.studentsAttempted;
        });
        
        const alignedData = allQuizNames.map((name) =>
          countMap.hasOwnProperty(name) ? countMap[name] : null
        );
        
        return {
          label: `${courseData.name} (Students)`,
          data: alignedData,
          backgroundColor: 'rgba(98, 74, 154, 0.9)', // Transparent background
          borderColor: getStudentCountColor(index),
          borderWidth: 2,
          borderDash: [5, 5], // Create a dashed line
          fill: false,
          tension: 0.2,
          yAxisID: 'y1', // Use second y-axis
          type: 'line',
        };
      });
    
    // Combine datasets
    const allDatasets = [...scoreDatasets, ...studentCountDatasets];
    
    // Create chart
    const ctx = document
      .getElementById("quizPerformanceChart")
      .getContext("2d");
    
    // KEY CHANGE: Store chart instance with the transformed chart ID
    // This ensures it uses the same key format as in openChartInModal
    charts[getChartInstanceName("quizPerformanceChart")] = new Chart(ctx, {
      type: "line",
      data: {
        labels: allQuizNames,
        datasets: allDatasets,
      },
      options: {
        ...commonChartOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            position: 'left',
            title: {
              display: true,
              text: "Average Score",
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
            },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false, // Only show grid lines for the primary y-axis
            },
            title: {
              display: true,
              text: "Students Count",
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
            },
            // Add these properties to ensure integers only
            ticks: {
              stepSize: 1,
              precision: 0  // No decimal places
            }
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const dataset = context.dataset;
                const value = dataset.data[context.dataIndex];
                const label = dataset.label || '';
                
                if (label.includes('(Avg Score)')) {
                  return `${label}: ${value} / 10`;
                } else if (label.includes('(Students)')) {
                  // Format student counts as integers
                  return `${label}: ${Math.round(value)} students`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    });
    
    // Also save with direct key as fallback (optional, for backward compatibility)
    charts["quizPerformanceChart"] = charts[getChartInstanceName("quizPerformanceChart")];
    
    hideLoading("quizPerformanceChart");
  } catch (error) {
    console.error("Error initializing quiz performance chart:", error);
    showError("quizPerformanceChart", "Failed to load quiz performance data");
  }
}
// 6. Activity Participation Chart
function initActivityParticipationChart(
  activities,
  studentActivities,
  courses,
  courseActivities
) {
  try {
    // Map activities to courses
    const activityToCourse = {};

    courseActivities.forEach((ca) => {
      activityToCourse[ca.activity_id] = ca.course_id;
    });
    // Calculate participation for each activity
    const activityData = activities.map((activity) => {
      const activityId = activity.activity_id;
      const courseId = activityToCourse[activityId];
      const course = courses.find((c) => c.course_id === courseId);

      // Get all participations for this activity
      const participations = studentActivities.filter(
        (sa) => sa.activity_id === activityId
      );

      return {
        name: activity.activity_title,
        course: course ? course.course_name : "Unknown Course",
        participationCount: participations.length,
      };
    });
    // Sort by participation count (highest first)
    activityData.sort((a, b) => b.participationCount - a.participationCount);
    // Take only the top 5 activities
    const topActivities = activityData.slice(0, 5);

    // Prepare data for chart
    const activityNames = topActivities.map((a) => a.name);
    const participationCounts = topActivities.map((a) => a.participationCount);

    // Create chart
    const ctx = document
      .getElementById("activityParticipationChart")
      .getContext("2d");
    charts.activityParticipation = new Chart(ctx, {
      type: "bar",
      data: {
        labels: activityNames,
        datasets: [
          {
            label: "Student Participation",
            data: participationCounts,
            backgroundColor: chartColors.dayColors[1],
            borderColor: chartColors.dayTextColors[1],
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonChartOptions,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Number of Students",
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
              },
            },
          },
        },
      },
    });

    hideLoading("activityParticipationChart");
  } catch (error) {
    console.error("Error initializing activity participation chart:", error);
    showError(
      "activityParticipationChart",
      "Failed to load activity participation data"
    );
  }
}
function initAtRiskStudentsTable(
  students,
  courses,
  enrollments,
  assignments,
  studentAssignments,
  quizzes,
  studentQuizzes,
  studentActivities
) {
  try {
    // Get students enrolled in instructor's courses
    const enrolledStudents = [];
    
    // Create a map to avoid duplicates
    const processedStudents = new Map();

    enrollments.forEach((enrollment) => {
      const studentId = enrollment.student_id;
      const courseId = enrollment.course_id;

      // Only process each student-course pair once
      const key = `${studentId}-${courseId}`;
      if (!processedStudents.has(key)) {
        processedStudents.set(key, true);

        const student = students.find((s) => s.student_id === studentId);
        const course = courses.find((c) => c.course_id === courseId);

        if (student && course) {
          enrolledStudents.push({
            studentId: studentId,
            courseId: courseId,
            studentName: student.student_name,
            courseName: course.course_name,
          });
        }
      }
    });
    
    // Calculate risk factors for each student
    const atRiskStudents = [];
    enrolledStudents.forEach((enrollment) => {
      const studentId = enrollment.studentId;
      const courseId = enrollment.courseId;

      // Count missing assignments
      const courseAssignments = assignments.filter(
        (a) => a.course_id === courseId
      );
      
      const studentAssignmentSubmissions = studentAssignments.filter(
        (sa) =>
          sa.student_id === studentId &&
          courseAssignments.some((a) => a.assign_id === sa.assign_id && sa.assign_path)
      );
      const missingAssignments =
        courseAssignments.length - studentAssignmentSubmissions.length;
      
      // Calculate average quiz score
      const courseQuizzes = quizzes.filter((q) => q.course_id === courseId);
      const hasQuizzes = courseQuizzes.length > 0;
      
      let avgQuizScore = null;
      let isQuizScoreLow = false;
      
      if (hasQuizzes) {
        const studentQuizSubmissions = studentQuizzes.filter(
          (sq) =>
            sq.student_id === studentId &&
            courseQuizzes.some((q) => q.quiz_id === sq.quiz_id)
        );
        
        const totalScore = studentQuizSubmissions.reduce(
          (sum, sq) => sum + Number(sq.score),
          0
        );

        avgQuizScore = studentQuizSubmissions.length > 0
          ? totalScore / studentQuizSubmissions.length
          : 0;
          
        isQuizScoreLow = avgQuizScore < 5;
      }
      
      // Determine if student is at risk:
      // - If there are quizzes: student is at risk if missing more than 2 assignments OR average quiz score is less than 5
      // - If there are no quizzes: student is at risk only if missing more than 2 assignments
      const isAtRisk = missingAssignments > 2 || (hasQuizzes && isQuizScoreLow);
      
      if (isAtRisk) {
        atRiskStudents.push({
          studentName: enrollment.studentName,
          courseName: enrollment.courseName,
          missingAssignments,
          avgQuizScore: hasQuizzes ? Number.parseFloat(avgQuizScore.toFixed(1)) : 'not available',
          studentId,
          courseId,
        });
      }
    });

    // Sort by risk level (most at risk first)
    atRiskStudents.sort((a, b) => {
      // More missing assignments = higher risk
      if (a.missingAssignments !== b.missingAssignments) {
        return b.missingAssignments - a.missingAssignments;
      }

      // For quiz scores, handle 'not available' case
      if (a.avgQuizScore === 'not available' && b.avgQuizScore === 'not available') {
        return 0;
      } else if (a.avgQuizScore === 'not available') {
        return 1; // Push 'not available' scores down in the sort
      } else if (b.avgQuizScore === 'not available') {
        return -1; // Push 'not available' scores down in the sort
      }

      // Lower quiz score = higher risk
      return a.avgQuizScore - b.avgQuizScore;
    });

    // Populate table
    const tableBody = document.getElementById("atRiskStudentsBody");
    
    // Initial display of all at-risk students
    displayAtRiskStudents(atRiskStudents, tableBody);
    
    // Set up search functionality
    setupAtRiskSearch(atRiskStudents);

    // Hide the loading spinner
    hideLoading("atRiskStudents");
  } catch (error) {
    console.error("Error initializing at-risk students table:", error);
    showError("atRiskStudents", "Failed to load at-risk students data");
  }
}

function setupAtRiskSearch(atRiskStudents) {
  // First enhance the search input (this adds our custom clear button)
  enhanceSearchInput();
  
  const searchInput = document.getElementById('atRiskSearch');
  const tableBody = document.getElementById('atRiskStudentsBody');
  
  // Store the original table data for filtering
  const originalTableData = atRiskStudents;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    
    // If search is empty, restore all rows
    if (searchTerm === '') {
      displayAtRiskStudents(originalTableData, tableBody);
      return;
    }
    
    // Filter students based on search term
    const filteredStudents = originalTableData.filter(student => {
      return (
        student.studentName.toLowerCase().includes(searchTerm) ||
        student.courseName.toLowerCase().includes(searchTerm) ||
        student.missingAssignments.toString().includes(searchTerm) ||
        student.avgQuizScore.toString().includes(searchTerm)
      );
    });
    
    // Display filtered results
    displayAtRiskStudents(filteredStudents, tableBody);
  });
}
function displayAtRiskStudents(students, tableBody) {
  tableBody.innerHTML = '';
  
  if (students.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="loading-text">No matching students found</td>`;
    tableBody.appendChild(row);
  } else {
    students.forEach(student => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${student.studentName}</td>
        <td>${student.courseName}</td>
        <td>${student.missingAssignments}</td>
        <td>${student.avgQuizScore}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}
function enhanceSearchInput() {
  // Find the search input
  const searchInput = document.getElementById('atRiskSearch');
  
  // Create a container div to wrap the search input
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  
  // Replace the search input with the container
  searchInput.parentNode.replaceChild(searchContainer, searchInput);
  
  // Add the search input to the container
  searchContainer.appendChild(searchInput);
  
  // Create the clear button
  const clearButton = document.createElement('button');
  clearButton.className = 'search-clear';
  clearButton.type = 'button';
  clearButton.setAttribute('aria-label', 'Clear search');
  
  // Add SVG icon for the clear button
  clearButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  
  // Append the clear button to the container
  searchContainer.appendChild(clearButton);
  
  // Show/hide clear button based on input content
  searchInput.addEventListener('input', function() {
    clearButton.style.display = this.value ? 'block' : 'none';
  });
  
  // Handle clear button click
  clearButton.addEventListener('click', function() {
    searchInput.value = '';
    searchInput.focus();
    clearButton.style.display = 'none';
    
    // Trigger the input event to update the table filtering
    const inputEvent = new Event('input', { bubbles: true });
    searchInput.dispatchEvent(inputEvent);
  });
}
function applyFilters() {
  const courseId = document.getElementById("courseFilter").value;
  // const timeRange = document.getElementById("timeRangeFilter").value;

  // Show loading indicators for all charts during filtering
  showLoading("coursePerformanceChart");
  showLoading("studentEngagementChart");
  showLoading("assignmentCompletionChart");
  showLoading("quizPerformanceChart");
  showLoading("studentProgressChart");
  showLoading("activityParticipationChart");
  showLoading("performanceTrendChart");
  showLoading("atRiskStudents");

  // Clear existing charts before creating new ones
  Object.keys(charts).forEach((chartKey) => {
    if (charts[chartKey]) {
      charts[chartKey].destroy();
      charts[chartKey] = null;
    }
  });

  // Fetch all necessary data again, but we'll filter it before updating charts
  Promise.all([
    fetchInstructorData(instructorId),
    fetchInstructorCourses(instructorId),
    fetchStudents(),
    fetchEnrollments(instructorId),
    fetchInstructorAssignments(instructorId),
    fetchStudentAssignments(),
    fetchInstructorQuizzes(instructorId),
    fetchStudentQuizzes(),
    fetchInstructorActivities(instructorId),
    fetchCourseActivities(),
    fetchStudentActivities(),
    fetchInstructorSessions(instructorId),
  ])
    .then(
      ([
        instructorData,
        instructorCourses,
        studentsData,
        enrollmentData,
        assignmentsData,
        studentAssignmentData,
        quizzesData,
        studentQuizData,
        activitiesData,
        courseActivityData,
        studentActivityData,
        sessionsData,
      ]) => {
        // Filter data based on selected course if not "all"
        let filteredCourses = instructorCourses;
        let filteredEnrollments = enrollmentData;
        let filteredAssignments = assignmentsData;
        let filteredQuizzes = quizzesData;
        let filteredActivities = activitiesData;
        let filteredCourseActivities = courseActivityData;

        if (courseId !== "all") {
          // Filter courses to only include the selected course
          filteredCourses = instructorCourses.filter(
            (course) => course.course_id.toString() === courseId
          );

          // Filter enrollments for the selected course
          filteredEnrollments = enrollmentData.filter(
            (enrollment) => enrollment.course_id.toString() === courseId
          );
          // Filter assignments for the selected course
          filteredAssignments = assignmentsData.filter(
            (assignment) => assignment.course_id.toString() === courseId
          );

          // Filter quizzes for the selected course
          filteredQuizzes = quizzesData.filter(
            (quiz) => quiz.course_id.toString() === courseId
          );

          // Filter activities based on course relationships
          const courseActivityIds = courseActivityData
            .filter((ca) => ca.course_id.toString() === courseId)
            .map((ca) => ca.activity_id);

          filteredActivities = activitiesData.filter((activity) =>
            courseActivityIds.includes(activity.activity_id)
          );

          filteredCourseActivities = courseActivityData.filter(
            (ca) => ca.course_id.toString() === courseId
          );
        }

        // Update summary cards with filtered data
        updateSummaryCards(
          filteredCourses,
          studentsData,
          filteredEnrollments,
          filteredAssignments,
          studentAssignmentData
        );

        // Update each chart with filtered data
        initCoursePerformanceChart(
          filteredCourses,
          filteredEnrollments,
          studentAssignmentData,
          studentQuizData,
          filteredAssignments,
          filteredQuizzes
        );

        initStudentEngagementChart(
          filteredCourses,
          filteredEnrollments,
          studentActivityData,
          studentAssignmentData,
          studentQuizData,
          filteredAssignments,
          filteredQuizzes,
          sessionsData
        );

        initAssignmentCompletionChart(
          filteredAssignments,
          studentAssignmentData,
          filteredCourses,
          filteredEnrollments
        );

        initQuizPerformanceChart(
          filteredQuizzes,
          studentQuizData,
          filteredCourses
        );

        initActivityParticipationChart(
          filteredActivities,
          studentActivityData,
          filteredCourses,
          filteredCourseActivities
        );

        initCGPADistributionChart(studentsData, filteredEnrollments);

        // Initialize at-risk students table with filtered data
        initAtRiskStudentsTable(
          studentsData,
          filteredCourses,
          filteredEnrollments,
          filteredAssignments,
          studentAssignmentData,
          filteredQuizzes,
          studentQuizData,
          studentActivityData
        );

        // Update the page title based on filtered data
        updatePageTitle();
      }
    )
    .catch((error) => {
      console.error("Error applying filters:", error);
      // Show error message
      document.querySelectorAll(".chart-container").forEach((container) => {
        const canvasId = container.querySelector("canvas")?.id;
        if (canvasId) {
          showError(canvasId, "Failed to apply filters");
        }
      });
    });
}

// Refresh all charts (simplified version that just calls applyFilters)
function refreshCharts() {
  applyFilters();
}
document.addEventListener("DOMContentLoaded", () => {
  // Initialize reports
  initializeReports();

  // Set up filter event listeners with debounce
  let filterTimeout;

  document
    .getElementById("courseFilter")
    .addEventListener("change", function () {
      clearTimeout(filterTimeout);

      // Update UI to show selected course
      const selectedOption = this.options[this.selectedIndex];
      // Apply filters with a slight delay to prevent multiple rapid executions
      filterTimeout = setTimeout(applyFilters, 100);
    });

  document
    .getElementById("refreshBtn")
    .addEventListener("click", refreshCharts);

  // Add click event listener to close dropdown when clicking outside
  document.addEventListener("click", function (event) {
    const dropdown = document.querySelector(".dropdown-content");
    const filterButton = document.querySelector(".filter-dropdown");

    if (
      dropdown &&
      dropdown.classList.contains("show") &&
      !event.target.matches(".filter-dropdown") &&
      !filterButton.contains(event.target)
    ) {
      dropdown.classList.remove("show");
    }
  });

  // Toggle dropdown display
  const filterDropdowns = document.querySelectorAll(".filter-dropdown");
  filterDropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", function () {
      const dropdownContent = this.querySelector(".dropdown-content");
      if (dropdownContent) {
        dropdownContent.classList.toggle("show");
      }
    });
  });
});
// Helper function to get the currently selected course name
function getSelectedCourseName() {
  const courseFilter = document.getElementById("courseFilter");
  return courseFilter.options[courseFilter.selectedIndex].textContent;
}

// Update the page title based on selected filters
function updatePageTitle() {
  const courseName = getSelectedCourseName();
  // const timeRange = document.getElementById("timeRangeFilter").value;

  let title = "Instructor Analytics";
  if (courseName !== "All My Courses") {
    title += ` - ${courseName}`;
  }
  document.getElementById("dashboardTitle").textContent = title;
}
if (isInstitutionSchool()) {
  document.querySelectorAll(".card-title").forEach((title) => {
    title.textContent = title.textContent.replace("Assignment", "Homework");
    title.textContent = title.textContent.replace("Project", "Activity");
  });
  document.querySelectorAll(".key-change").forEach((title) => {
    title.textContent = title.textContent.replace("Assignment", "Homework");
  });
}
// 1. First, add the HTML for the modal to your page
// Add this to your HTML file, ideally right before the closing body tag

function addChartModalToDOM() {
  // Create the modal container
  const modalContainer = document.createElement("div");
  modalContainer.id = "chartModal";
  modalContainer.className = "modal";
  modalContainer.style.display = "none";

  // Create the modal content
  modalContainer.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalChartTitle" class="key-change">Chart Details</h2>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="chart-container">
          <canvas id="modalChartCanvas"></canvas>
        </div>
        <div id="modalChartDetails" class="chart-details">
          <!-- Details will be populated dynamically -->
        </div>
      </div>
    </div>
  `;

  // Add the modal to the DOM
  document.body.appendChild(modalContainer);
}
let modalChartInstance = null;

function openChartInModal(chartId) {
  // Get the chart instance
  console.log("Opening chart:", chartId);
  
  // Try to get chart using transformed name, then fall back to direct name
  let chart = charts[getChartInstanceName(chartId)];
  
  // Add debugging to see what's happening
  console.log("Transformed chart ID:", getChartInstanceName(chartId));
  console.log("Charts object keys:", Object.keys(charts));
  
  if (!chart) {
    console.log("Chart not found with transformed ID, trying direct ID");
    chart = charts[chartId];
  }
  
  console.log("Retrieved chart:", chart);
  
  if (!chart) {
    console.error(`Chart with ID ${chartId} not found`);
    return;
  }
  
  // Get modal elements
  const modal = document.getElementById("chartModal");
  const modalTitle = document.getElementById("modalChartTitle");
  const modalChartDetails = document.getElementById("modalChartDetails");
  
  // Set modal title based on chart ID
  const chartTitle = getChartTitle(chartId);
  modalTitle.textContent = chartTitle;
  
  // Create a new canvas for the modal chart
  const modalChartCanvas = document.getElementById("modalChartCanvas");
  
  // Destroy previous chart instance if it exists
  if (modalChartInstance) {
    modalChartInstance.destroy();
    modalChartInstance = null;
  }
  
  if (isInstitutionSchool()) {
    document.querySelectorAll(".card-title").forEach((title) => {
      title.textContent = title.textContent.replace("Assignment", "Homework");
      title.textContent = title.textContent.replace("Project", "Activity");
    });
    document.querySelectorAll(".key-change").forEach((title) => {
      title.textContent = title.textContent.replace("Assignment", "Homework");
    });
  }
  
  const ctx = modalChartCanvas.getContext("2d");
  
  // Clone the data properly
  const clonedData = JSON.parse(JSON.stringify(chart.data));
  
  // Deep clone the options without functions
  const modalOptions = JSON.parse(JSON.stringify(chart.options));
  
  // Set standard modal options
  modalOptions.responsive = true;
  modalOptions.maintainAspectRatio = false;
  
  // Determine chart type and apply appropriate tooltip callbacks
  if (chartId === "studentEngagementChart" || chartId === "CGPADistributionChart") {
    // For doughnut/pie charts with percentage display
    modalOptions.plugins = modalOptions.plugins || {};
    modalOptions.plugins.tooltip = modalOptions.plugins.tooltip || {};
    modalOptions.plugins.tooltip.callbacks = {
      label: function(context) {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = ((context.raw / total) * 100).toFixed(1);
        return `${context.label}: ${context.raw} students (${percentage}%)`;
      }
    };
  } else if (chartId.toLowerCase().includes("percent") || 
             chartId.toLowerCase().includes("rate") ||
             chartId.toLowerCase().includes("distribution")) {
    // For percentage-based charts
    modalOptions.plugins = modalOptions.plugins || {};
    modalOptions.plugins.tooltip = modalOptions.plugins.tooltip || {};
    modalOptions.plugins.tooltip.callbacks = {
      label: function(context) {
        const label = context.label || context.dataset.label || '';
        const value = context.raw || 0;
        return `${label}: ${value}%`;
      }
    };
  } else if (chart.config.type === "bar" || chart.config.type === "line") {
    // For standard bar/line charts
    modalOptions.plugins = modalOptions.plugins || {};
    modalOptions.plugins.tooltip = modalOptions.plugins.tooltip || {};
    modalOptions.plugins.tooltip.callbacks = {
      label: function(context) {
        const label = context.dataset.label || '';
        const value = context.raw || 0;
        return `${label}: ${value}`;
      }
    };
  } else {
    // Default tooltip callback
    modalOptions.plugins = modalOptions.plugins || {};
    modalOptions.plugins.tooltip = modalOptions.plugins.tooltip || {};
    modalOptions.plugins.tooltip.callbacks = {
      label: function(context) {
        // Ensure we have a label, either from the datapoint or the dataset
        const label = context.label || (context.dataset ? context.dataset.label : '') || '';
        const value = context.raw || 0;
        return `${label}: ${value}`;
      }
    };
  }
  
  // Create the new chart instance
  modalChartInstance = new Chart(ctx, {
    type: chart.config.type,
    data: clonedData,
    options: modalOptions
  });
  
  // Generate detailed insights based on chart type
  const chartDetails = generateChartInsights(chartId, chart);
  modalChartDetails.innerHTML = chartDetails;
  
  // Show the modal
  modal.style.display = "block";
}
// Modify the close event handlers to destroy the chart when modal is closed
function initChartModal() {
  // Add the modal to the DOM
  addChartModalToDOM();

  // Get modal elements
  const modal = document.getElementById("chartModal");
  const closeBtn = modal.querySelector(".modal-close");

  // Close modal when clicking on the X
  closeBtn.addEventListener("click", function () {
    modal.style.display = "none";
    // Destroy the chart when closing the modal
    if (modalChartInstance) {
      modalChartInstance.destroy();
      modalChartInstance = null;
    }
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      // Destroy the chart when closing the modal
      if (modalChartInstance) {
        modalChartInstance.destroy();
        modalChartInstance = null;
      }
    }
  });

  // Make chart containers clickable
  const chartContainers = document.querySelectorAll(".chart-container");
  chartContainers.forEach((container) => {
    container.style.cursor = "pointer";
    container.addEventListener("click", function () {
      const chartId = this.querySelector("canvas").id;
      openChartInModal(chartId);
    });
  });
}

// 4. Helper function to get chart instance name from DOM ID
function getChartInstanceName(chartId) {
  const chartNameMap = {
    coursePerformanceChart: "coursePerformance",
    studentEngagementChart: "studentEngagement",
    assignmentCompletionChart: "assignmentCompletion",
    quizPerformanceChart: "quizPerformance",
    studentProgressChart: "studentProgress",
    activityParticipationChart: "activityParticipation",
    CGPADistributionChart: "CGPADistribution",
  };
  return chartNameMap[chartId];
}

// 5. Helper function to get chart title from chart ID
function getChartTitle(chartId) {
  const chartTitleMap = {
    coursePerformanceChart: "Course Performance Analysis",
    studentEngagementChart: "Student Engagement Distribution",
    assignmentCompletionChart: "Assignment Completion Rates",
    quizPerformanceChart: "Quiz Performance Analysis",
    studentProgressChart: "Student Progress Distribution",
    activityParticipationChart: "Activity Participation Analysis",
    CGPADistributionChart: "CGPA Distribution Analysis",
  };
  return chartTitleMap[chartId] || "Chart Details";
}

// 6. Function to generate detailed insights for each chart type
function generateChartInsights(chartId, chart) {
  let insights =
    chartId === "CGPADistributionChart" ? "" : "<h3>Key Insights</h3>";

  switch (chartId) {
    case "coursePerformanceChart":
      insights += generateCoursePerformanceInsights(chart);
      break;
    case "studentEngagementChart":
      insights += generateStudentEngagementInsights(chart);
      break;
    case "assignmentCompletionChart":
      insights += generateAssignmentCompletionInsights(chart);
      break;
    case "quizPerformanceChart":
      insights += generateQuizPerformanceInsights(chart);
      break;
    case "studentProgressChart":
      insights += generateStudentProgressInsights(chart);
      break;
    case "activityParticipationChart":
      insights += generateActivityParticipationInsights(chart);
      break;
    case "CGPADistributionChart":
      // insights += generatePerformanceTrendInsights(chart);
      break;
    default:
      insights += "<p>No specific insights available for this chart type.</p>";
  }

  insights += '<div class="insight-actions">';
  insights +=
    '<button class="btn btn-primary btn-sm" onclick="exportChartData()">Export Data</button>';
  insights +=
    '<button class="btn btn-outline-primary btn-sm" onclick="printChart()">Print Chart</button>';
  insights += "</div>";

  return insights;
}

// 7. Insight generator functions for each chart type
function generateCoursePerformanceInsights(chart) {
  let insights = "<ul>";

  // Get the course with highest enrollment
  const enrollmentData = chart.data.datasets[0].data;
  const labels = chart.data.labels;
  const maxEnrollmentIdx = enrollmentData.indexOf(Math.max(...enrollmentData));

  // Get the course with highest assignment completion rate
  const completionRateData = chart.data.datasets[1].data;
  const maxCompletionIdx = completionRateData.indexOf(
    Math.max(...completionRateData)
  );

  // Get the course with highest quiz score
  const quizScoreData = chart.data.datasets[2].data;
  const maxQuizScoreIdx = quizScoreData.indexOf(Math.max(...quizScoreData));

  // Calculate average quiz score and completion rate
  const avgQuizScore =
    quizScoreData.reduce((sum, score) => sum + score, 0) / quizScoreData.length;
  const avgCompletionRate =
    completionRateData.reduce((sum, rate) => sum + rate, 0) /
    completionRateData.length;

  insights += `<li><strong>Highest Enrollment:</strong> ${labels[maxEnrollmentIdx]} (${enrollmentData[maxEnrollmentIdx]} students)</li>`;
  insights += `<li><strong>Best ${isInstitutionSchool() ? "Homework" : "Assignment"} Completion:</strong> ${labels[maxCompletionIdx]} (${completionRateData[maxCompletionIdx]}%)</li>`;
  insights += `<li><strong>Best Quiz Performance:</strong> ${labels[maxQuizScoreIdx]} (${quizScoreData[maxQuizScoreIdx]} avg. score)</li>`;
  insights += `<li><strong>Average ${isInstitutionSchool() ? "Homework" : "Assignment"} Completion Rate:</strong> ${avgCompletionRate.toFixed(
    1
  )}%</li>`;
  insights += `<li><strong>Average Quiz Score:</strong> ${avgQuizScore.toFixed(
    1
  )}</li>`;

  insights += "</ul>";
  return insights;
}

function generateStudentEngagementInsights(chart) {
  let insights = "<ul>";

  // Calculate total students
  const data = chart.data.datasets[0].data;
  const labels = chart.data.labels;
  const totalStudents = data.reduce((sum, count) => sum + count, 0);

  // Calculate engagement percentages
  const engagementPercentages = data.map((count) =>
    ((count / totalStudents) * 100).toFixed(1)
  );

  // Find highest and lowest engagement categories
  const maxEngagementIdx = data.indexOf(Math.max(...data));
  const minEngagementIdx = data.indexOf(Math.min(...data));

  insights += `<li><strong>Total Students Analyzed:</strong> ${totalStudents}</li>`;
  insights += `<li><strong>Most Common Engagement Level:</strong> ${labels[maxEngagementIdx]} (${engagementPercentages[maxEngagementIdx]}%)</li>`;
  insights += `<li><strong>Least Common Engagement Level:</strong> ${labels[minEngagementIdx]} (${engagementPercentages[minEngagementIdx]}%)</li>`;

  // Add insights about inactive students if applicable
  const inactiveIdx = labels.findIndex((label) => label === "Inactive");
  if (inactiveIdx !== -1) {
    insights += `<li><strong>Inactive Students:</strong> ${data[inactiveIdx]} (${engagementPercentages[inactiveIdx]}% of total)</li>`;
  }

  // Add insights about highly engaged students
  const highIdx = labels.findIndex((label) => label === "High");
  if (highIdx !== -1) {
    insights += `<li><strong>Highly Engaged Students:</strong> ${data[highIdx]} (${engagementPercentages[highIdx]}% of total)</li>`;
  }

  insights += "</ul>";
  return insights;
}

function generateAssignmentCompletionInsights(chart) {
  let insights = "<ul>";

  const completedData = chart.data.datasets[0].data;
  const incompleteData = chart.data.datasets[1].data;
  const labels = chart.data.labels;

  // Find assignment with highest completion rate
  const maxCompletionIdx = completedData.indexOf(Math.max(...completedData));

  // Find assignment with lowest completion rate
  const minCompletionIdx = completedData.indexOf(Math.min(...completedData));

  // Calculate average completion rate
  const avgCompletionRate =
    completedData.reduce((sum, rate) => sum + rate, 0) / completedData.length;
  
  insights += `<li><strong>Best Completion Rate:</strong> ${labels[maxCompletionIdx]} (${completedData[maxCompletionIdx]}%)</li>`;
  insights += `<li><strong>Lowest Completion Rate:</strong> ${labels[minCompletionIdx]} (${completedData[minCompletionIdx]}%)</li>`;
  insights += `<li><strong>Average Completion Rate:</strong> ${avgCompletionRate.toFixed(
    1
  )}%</li>`;

  // Add insights about assignments with low completion rates
  const lowCompletionAssignments = labels.filter(
    (_, idx) => completedData[idx] < 50
  );

  if (lowCompletionAssignments.length > 0) {
    insights += `<li><strong>${isInstitutionSchool() ? "Homework" : "Assignment"} with <50% Completion:</strong> ${lowCompletionAssignments.length} assignments</li>`;
  }

  insights += "</ul>";
  return insights;
}

function generateQuizPerformanceInsights(chart) {
  let insights = "<ul>";

  const datasets = chart.data.datasets;
  const labels = chart.data.labels;

  // Find overall highest and lowest scores
  let highestScore = 0;
  let lowestScore = 100;
  let highestCourse = "";
  let lowestCourse = "";
  let highestQuiz = "";
  let lowestQuiz = "";

  datasets.forEach((dataset) => {
    const courseName = dataset.label;
    dataset.data.forEach((score, idx) => {
      if (score > highestScore) {
        highestScore = score;
        highestCourse = courseName;
        highestQuiz = labels[idx];
      }
      if (score < lowestScore && score > 0) {
        lowestScore = score;
        lowestCourse = courseName;
        lowestQuiz = labels[idx];
      }
    });
  });

  // Calculate average scores per course
  const courseAverages = datasets.map((dataset) => {
    const validScores = dataset.data.filter((score) => score > 0);
    const avg =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return {
      course: dataset.label,
      average: avg ? avg.toFixed(1) : 'not available yet',
    };
  });
  console.log(datasets);
  

  insights += `<li><strong>Highest Quiz Score:</strong> ${highestQuiz} in ${highestCourse} (${highestScore.toFixed(
    1
  )})</li>`;
  insights += `<li><strong>Lowest Quiz Score:</strong> ${lowestQuiz} in ${lowestCourse} (${lowestScore.toFixed(
    1
  )})</li>`;

  insights += "<li><strong>Average Scores by Course:</strong><ul>";
  courseAverages.forEach((item) => {
    console.log(item);
    
    insights += `<li>${item.course}: ${item.average}</li>`;
  });
  insights += "</ul></li>";

  insights += "</ul>";
  return insights;
}

function generateStudentProgressInsights(chart) {
  let insights = "<ul>";

  const data = chart.data.datasets[0].data;
  const labels = chart.data.labels;
  const totalStudents = data.reduce((sum, count) => sum + count, 0);

  // Calculate percentages
  const progressPercentages = data.map((count) =>
    ((count / totalStudents) * 100).toFixed(1)
  );

  // Find highest and lowest progress categories
  const maxProgressIdx = data.indexOf(Math.max(...data));

  // Calculate students at risk
  const atRiskIdx = labels.findIndex((label) => label.includes("At Risk"));
  const atRiskPercentage =
    atRiskIdx !== -1 ? progressPercentages[atRiskIdx] : 0;

  // Calculate successful students (Excellent + Good)
  const excellentIdx = labels.findIndex((label) => label.includes("Excellent"));
  const goodIdx = labels.findIndex((label) => label.includes("Good"));

  const successfulCount =
    (excellentIdx !== -1 ? data[excellentIdx] : 0) +
    (goodIdx !== -1 ? data[goodIdx] : 0);
  const successfulPercentage = (
    (successfulCount / totalStudents) *
    100
  ).toFixed(1);

  insights += `<li><strong>Total Students:</strong> ${totalStudents}</li>`;
  insights += `<li><strong>Most Common Progress Level:</strong> ${labels[maxProgressIdx]} (${progressPercentages[maxProgressIdx]}%)</li>`;
  insights += `<li><strong>Students at Risk:</strong> ${
    atRiskIdx !== -1 ? data[atRiskIdx] : 0
  } (${atRiskPercentage}%)</li>`;
  insights += `<li><strong>Successful Students (80%+ Progress):</strong> ${successfulCount} (${successfulPercentage}%)</li>`;

  insights += "</ul>";
  return insights;
}

function generateActivityParticipationInsights(chart) {
  let insights = "<ul>";

  const participationData = chart.data.datasets[0].data;
  const activities = chart.data.labels;

  // Find most and least popular activities
  const maxParticipationIdx = participationData.indexOf(
    Math.max(...participationData)
  );
  const minParticipationIdx = participationData.indexOf(
    Math.min(...participationData)
  );

  // Calculate average participation
  const avgParticipation =
    participationData.reduce((sum, count) => sum + count, 0) /
    participationData.length;
  console.log(avgParticipation);
  
  // Calculate total participants
  const totalParticipants = participationData.reduce(
    (sum, count) => sum + count,
    0
  );

  insights += `<li><strong>Most Popular Activity:</strong> ${activities[maxParticipationIdx]} (${participationData[maxParticipationIdx]} students)</li>`;
  insights += `<li><strong>Least Popular Activity:</strong> ${activities[minParticipationIdx]} (${participationData[minParticipationIdx]} students)</li>`;
  insights += `<li><strong>Average Participation per Activity:</strong> ${avgParticipation.toFixed(
    1
  )} students</li>`;
  insights += `<li><strong>Total ${isInstitutionSchool() ? "Activity" : "Project"} Participations:</strong> ${totalParticipants}</li>`;

  insights += "</ul>";
  return insights;
}
// Function to export chart data to CSV
function exportChartData(chartId) {
  // Get the chart instance from the chart registry
  const chartInstance = Chart.getChart(chartId);

  if (!chartInstance) {
    console.error("Chart not found:", chartId);
    alert("Error: Chart data could not be exported.");
    return;
  }

  // Extract labels and datasets
  const labels = chartInstance.data.labels;
  const datasets = chartInstance.data.datasets;

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add header row with dataset names
  let headerRow = "Category";
  datasets.forEach((dataset) => {
    headerRow += "," + (dataset.label || "Data");
  });
  csvContent += headerRow + "\r\n";

  // Add data rows
  labels.forEach((label, i) => {
    let row = label;
    datasets.forEach((dataset) => {
      row += "," + (dataset.data[i] !== undefined ? dataset.data[i] : "");
    });
    csvContent += row + "\r\n";
  });

  // Create a download link and trigger the download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${chartId}_data.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// function printChart() {
//   window.print();
// }
function printChart(chartId) {
  // Get the chart instance
  const chartInstance = Chart.getChart(chartId);

  if (!chartInstance) {
    console.error("Chart not found:", chartId);
    alert("Error: Chart could not be printed.");
    return;
  }

  // Create a new window for printing
  const printWindow = window.open("", "_blank");

  // Get chart title
  let chartTitle = chartId;
  // Try to get a more user-friendly title
  if (
    chartInstance.options &&
    chartInstance.options.plugins &&
    chartInstance.options.plugins.title
  ) {
    chartTitle = chartInstance.options.plugins.title.text || chartTitle;
  }

  // Format chart title from camelCase or snake_case
  chartTitle = chartTitle
    .replace(/([A-Z])/g, " $1") // Space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter

  // Create print HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${chartTitle}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          text-align: center;
        }
        .chart-container {
          max-width: 850px;
          margin: 0 auto;
        }
        .chart-info {
          margin-top: 20px;
          text-align: left;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        h1 {
          color: #333;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>${chartTitle}</h1>
      <div class="chart-container">
        <img src="${chartInstance.toBase64Image()}" width="100%">
      </div>
      <div class="chart-info">
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="no-print">
        <p>Press Ctrl+P or Cmd+P to print this chart, or close this window to return.</p>
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;

  // Write to the new window and prepare for printing
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Give the browser a moment to render before printing
  setTimeout(() => {
    printWindow.focus();
  }, 500);
}
function exportChartAsImage(chartId) {
  const chartInstance = Chart.getChart(chartId);

  if (!chartInstance) {
    console.error("Chart not found:", chartId);
    alert("Error: Chart could not be exported as image.");
    return;
  }

  let chartTitle = chartId;
  if (
    chartInstance.options &&
    chartInstance.options.plugins &&
    chartInstance.options.plugins.title
  ) {
    chartTitle = chartInstance.options.plugins.title.text || chartTitle;
  }

  const filename = chartTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png";

  // Create an offscreen canvas with white background
  const canvas = chartInstance.canvas;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  const ctx = tempCanvas.getContext("2d");

  // Fill background with white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Draw the chart onto the white background
  ctx.drawImage(canvas, 0, 0);

  // Export the image
  const link = document.createElement("a");
  link.download = filename;
  link.href = tempCanvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// Update the chart modal to include the export options
function updateChartModalActions(chartId) {
  const actionsContainer = document.querySelector(".insight-actions");

  if (!actionsContainer) {
    console.error("Actions container not found in chart modal");
    return;
  }

  // Clear existing actions
  actionsContainer.innerHTML = "";

  // Add export actions
  actionsContainer.innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="exportChartData('${chartId}')">
      <i class="fas fa-file-csv"></i> Export CSV
    </button>
    <button class="btn btn-outline-secondary btn-sm" onclick="exportChartAsImage('${chartId}')">
      <i class="fas fa-image"></i> Export Image
    </button>
    <button class="btn btn-outline-primary btn-sm" onclick="printChart('${chartId}')">
      <i class="fas fa-print"></i> Print Chart
    </button>
  `;
}
function updateInsightActions(chartId) {
  return `
    <div class="insight-actions">
      <button class="btn btn-primary btn-sm" onclick="exportChartData('${chartId}')">
        <i class="fas fa-file-csv"></i> Export CSV
      </button>
      <button class="btn btn-outline-secondary btn-sm" onclick="exportChartAsImage('${chartId}')">
        <i class="fas fa-image"></i> Export Image
      </button>
      <button class="btn btn-outline-primary btn-sm" onclick="printChart('${chartId}')">
        <i class="fas fa-print"></i> Print Chart
      </button>
    </div>
  `;
}
// 9. Initialize the chart modal when the page loads
document.addEventListener("DOMContentLoaded", function () {
  // Wait for charts to be initialized first
  setTimeout(initChartModal, 1000);
});

// 10. Make charts clickable by adding the necessary classes and click handlers
function makeChartsClickable() {
  // Get all chart canvases
  const chartCanvases = document.querySelectorAll('canvas[id$="Chart"]');

  // For each canvas, add the necessary classes and click handler
  chartCanvases.forEach((canvas) => {
    // Find the parent container
    const container = canvas.parentElement;

    // Add the chart-container class if not already present
    if (!container.classList.contains("chart-container")) {
      container.classList.add("chart-container");
    }

    // Add a clickable indicator
    const indicator = document.createElement("div");
    indicator.className = "chart-clickable-indicator";
    indicator.innerHTML =
      '<i class="fas fa-expand-alt"></i><span>Click to expand</span>';
    container.appendChild(indicator);
    // Add click handler
    container.addEventListener("click", function () {
      openChartInModal(canvas.id);
    });
  });
}

// Call makeChartsClickable after charts are initialized
document.addEventListener("DOMContentLoaded", function () {
  // Wait for charts to be initialized first
  setTimeout(makeChartsClickable, 1000);
});

const originalGenerateChartInsights = generateChartInsights;
generateChartInsights = function (chartId, chart) {
  // Get the original content without the actions
  let insights = originalGenerateChartInsights(chartId, chart);

  // Replace the original actions with our updated actions
  insights = insights.replace(
    /<div class="insight-actions">.*?<\/div>/s,
    updateInsightActions(chartId)
  );

  return insights;
};
document.addEventListener("DOMContentLoaded", function () {
  // Wait for charts to be initialized first
  setTimeout(() => {
    // Make sure the Chart global is available
    if (typeof Chart === "undefined") {
      console.error(
        "Chart.js is not loaded. Export and print functionality will not work."
      );
    }
    // Make functions globally accessible again to ensure they're available
    window.exportChartData = exportChartData;
    window.printChart = printChart;
    window.exportChartAsImage = exportChartAsImage;
  }, 1500);
});
