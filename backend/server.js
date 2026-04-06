const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data', 'mockDB.json');

const readDB = () => {
  if (!fs.existsSync(DB_PATH)) throw new Error('Database not found. Please run seed.js first.');
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

// 0. 로그인 엔드포인트
app.post('/api/login', (req, res) => {
  try {
    const db = readDB();
    const { email } = req.body;
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: '등록되지 않은 이메일입니다.' });
    }
    // 성공 시 user 정보 응답
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. 코스 목록 조회
app.get('/api/courses', (req, res) => {
  try {
    res.json(readDB().courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 단일 코스 조회
app.get('/api/courses/:id', (req, res) => {
  try {
    const course = readDB().courses.find(c => c.id === req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 내 수강 현황 조회
app.get('/api/enrollments', (req, res) => {
  try {
    const db = readDB();
    const userId = req.headers.authorization || "user_1"; // 없으면 기본값
    const myEnrollments = db.enrollments.filter(e => e.userId === userId);
    
    const result = myEnrollments.map(enroll => {
      const course = db.courses.find(c => c.id === enroll.courseId);
      return { ...enroll, course };
    }).filter(e => e.course);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 수강 강의 완료 처리
app.post('/api/enrollments/:courseId/complete', (req, res) => {
  try {
    const db = readDB();
    const userId = req.headers.authorization || "user_1";
    const courseId = req.params.courseId;
    const { lectureId } = req.body;

    const enrollmentIndex = db.enrollments.findIndex(
      e => e.userId === userId && e.courseId === courseId
    );

    if (enrollmentIndex === -1) return res.status(404).json({ error: 'Enrollment not found' });

    const currentCompleted = db.enrollments[enrollmentIndex].progress.completedLectures;
    if (!currentCompleted.includes(lectureId)) {
      currentCompleted.push(lectureId);
      writeDB(db);
    }
    
    res.json({ success: true, completedLectures: currentCompleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 강의 수강 신청
app.post('/api/enroll', (req, res) => {
  try {
    const db = readDB();
    const userId = req.headers.authorization || "user_1";
    const { courseId } = req.body;

    const existingEnrollment = db.enrollments.find(
      e => e.userId === userId && e.courseId === courseId
    );

    if (existingEnrollment) return res.status(400).json({ error: 'Already enrolled' });

    const newEnrollment = {
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      progress: { completedLectures: [] }
    };
    db.enrollments.push(newEnrollment);
    writeDB(db);

    res.json({ success: true, enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 관리자 통계 조회 API
app.get('/api/admin/stats', (req, res) => {
  try {
    const db = readDB();
    const roleId = req.headers.authorization || '';
    
    // 사실 실제라면 인증 검사를 해야 하지만 MVP이므로 생략 가능.
    // 그래도 role 체크 흉내만 내면 됨.
    const userRole = db.users.find(u => u.id === roleId)?.role;
    if(userRole === 'student' && false) {
      // return res.status(403).json({error: 'Forbidden'}); // MVP에서는 자유롭게 통과
    }

    const totalStudents = db.users.filter(u => u.role === 'student').length;
    const totalCourses = db.courses.length;
    const totalEnrollments = db.enrollments.length;

    // 코스별 수강생 수 카운트
    const enrollmentsByCourse = db.courses.map(course => {
      const eCount = db.enrollments.filter(e => e.courseId === course.id).length;
      return {
        courseTitle: course.title,
        count: eCount
      };
    }).sort((a,b) => b.count - a.count).slice(0, 5); // 상위 5개

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        enrollmentsByCourse
      },
      users: db.users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
