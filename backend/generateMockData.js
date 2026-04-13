const fs = require('fs');
const path = require('path');

const mockDBPath = path.join(__dirname, 'data', 'mockDB.json');
const data = JSON.parse(fs.readFileSync(mockDBPath, 'utf8'));

// 1. Generate more instructors
const newInstructors = [
  { id: "instructor_2", name: "이강사", email: "lee_ins@test.com", role: "instructor", xp: 0, level: 1 },
  { id: "instructor_3", name: "정멘토", email: "jung_mentor@test.com", role: "instructor", xp: 0, level: 1 },
  { id: "instructor_4", name: "홍지식", email: "hong@test.com", role: "instructor", xp: 0, level: 1 }
];

// 2. Generate more students
const firstNames = ["민수", "지은", "동현", "서연", "재민", "영희", "철수", "하나", "현우", "유진", "태윤", "수아", "성민", "윤서", "지원"];
const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];

const newStudents = [];
for (let i = 2; i <= 20; i++) { // Generate 19 more students
  const name = lastNames[Math.floor(Math.random() * lastNames.length)] + firstNames[Math.floor(Math.random() * firstNames.length)];
  newStudents.push({
    id: `user_${i}`,
    name,
    email: `student${i}@test.com`,
    role: "student",
    xp: Math.floor(Math.random() * 2000), // Random XP between 0 and 2000
    level: Math.floor(Math.random() * 20) + 1,
    streak: Math.floor(Math.random() * 10),
    badges: ["fast_learner", "week_warrior"].slice(0, Math.floor(Math.random() * 3))
  });
}

// Combine all users, preventing duplicates just in case
const allNewUsers = [...newInstructors, ...newStudents];
const existingUserIds = new Set(data.users.map(u => u.id));
for (const u of allNewUsers) {
  if (!existingUserIds.has(u.id)) {
    data.users.push(u);
  }
}

// 3. Generate random enrollments
const newEnrollments = [];
const courses = data.courses;

// Give each student 2-4 random courses
for (const student of newStudents) {
  const numCourses = Math.floor(Math.random() * 3) + 2; 
  const shuffledCourses = [...courses].sort(() => 0.5 - Math.random());
  
  for (let j = 0; j < numCourses; j++) {
    const course = shuffledCourses[j];
    
    // Simulate some logs for risk analysis
    const isRisk = Math.random() > 0.8; // 20% chance of being high risk
    const attentionLogs = [];
    if (isRisk) {
      attentionLogs.push({ eventType: "pause", timestamp: new Date().toISOString(), details: "paused for 10 min" });
      attentionLogs.push({ eventType: "seek_backward", timestamp: new Date().toISOString(), details: "rewinded 30s" });
      attentionLogs.push({ eventType: "seek_backward", timestamp: new Date().toISOString(), details: "rewinded 15s" });
    } else if (Math.random() > 0.5) {
      attentionLogs.push({ eventType: "play", timestamp: new Date().toISOString(), details: "normal play" });
    }

    newEnrollments.push({
      id: `enroll_${student.id}_${course.id}`,
      userId: student.id,
      courseId: course.id,
      attentionLogs,
      progress: {
        completedLectures: course.curriculum[0]?.lectures.slice(0, Math.floor(Math.random() * 2)).map(l => l.id) || [],
        positions: {}
      }
    });
  }
}

// Push to existing 
const existingEnrollmentIds = new Set(data.enrollments.map(e => e.id));
for (const e of newEnrollments) {
  if (!existingEnrollmentIds.has(e.id)) {
    data.enrollments.push(e);
  }
}

fs.writeFileSync(mockDBPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Added ${newInstructors.length} instructors and ${newStudents.length} students.`);
console.log(`Generated ${newEnrollments.length} new enrollments.`);
