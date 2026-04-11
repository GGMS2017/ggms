const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data', 'mockDB.json');
const JWT_SECRET = 'super-secret-starfish-key'; // 실제 상용에서는 환경변수로 빼야합니다.

const readDB = () => {
  if (!fs.existsSync(DB_PATH)) throw new Error('Database not found. Please run seed.js first.');
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

// 미들웨어: JWT 인증
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 없습니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: '토큰이 만료되었거나 유효하지 않습니다.' });
  }
};

// 0. 로그인 엔드포인트
app.post('/api/login', (req, res) => {
  try {
    const db = readDB();
    const { email } = req.body;
    // MVP: 비밀번호 해싱 검증 생략, 이메일로만 유저 확인 후 토큰 발급
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: '등록되지 않은 이메일입니다.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '12h' } // 12시간 유효
    );

    res.json({ success: true, token, user });
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

// 3. 내 수강 현황 조회 (Protected)
app.get('/api/enrollments', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.user.id;
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

// 4. 수강 동영상 진행률 저장 (Progress) - 주기적 호출 (Protected)
app.post('/api/enrollments/:courseId/progress', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { lectureId, currentTime } = req.body;

    const enrollmentIndex = db.enrollments.findIndex(
      e => e.userId === userId && e.courseId === courseId
    );

    if (enrollmentIndex === -1) return res.status(404).json({ error: '수강 중인 강의가 아닙니다.' });

    // progress.positions 에 현재 시청 시간 저장
    const currentProgress = db.enrollments[enrollmentIndex].progress;
    if (!currentProgress.positions) {
      currentProgress.positions = {};
    }
    
    // 이전 최대 시간보다 많이 봤을 경우 갱신 (이어보기용)
    currentProgress.positions[lectureId] = Math.max(currentProgress.positions[lectureId] || 0, currentTime);
    
    writeDB(db);
    res.json({ success: true, positions: currentProgress.positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 단일 강의 수강 완료 처리 (Protected)
app.post('/api/enrollments/:courseId/complete', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.user.id;
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

// 6. 강의 수강 신청 (Protected)
app.post('/api/enroll', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.user.id;
    const { courseId } = req.body;

    const existingEnrollment = db.enrollments.find(
      e => e.userId === userId && e.courseId === courseId
    );

    if (existingEnrollment) return res.status(400).json({ error: 'Already enrolled' });

    const newEnrollment = {
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      attentionLogs: [],
      progress: { completedLectures: [], positions: {} }
    };
    db.enrollments.push(newEnrollment);
    writeDB(db);

    res.json({ success: true, enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6.5. 수강생 학습 행동 트래킹 이벤트 저장 (Protected)
app.post('/api/enrollments/:courseId/events', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { eventType, timestamp, details } = req.body;

    const enrollmentIndex = db.enrollments.findIndex(
      e => e.userId === userId && e.courseId === courseId
    );

    if (enrollmentIndex === -1) return res.status(404).json({ error: 'Enrollment not found' });

    if (!db.enrollments[enrollmentIndex].attentionLogs) {
      db.enrollments[enrollmentIndex].attentionLogs = [];
    }

    db.enrollments[enrollmentIndex].attentionLogs.push({
      eventType,
      timestamp: timestamp || new Date().toISOString(),
      details
    });

    writeDB(db);
    res.json({ success: true, message: 'Event logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. 관리자 통계 조회 API (Protected - Admin Only)
app.get('/api/admin/stats', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const db = readDB();
    const totalStudents = db.users.filter(u => u.role === 'student').length;
    const totalCourses = db.courses.length;
    const totalEnrollments = db.enrollments.length;

    const enrollmentsByCourse = db.courses.map(course => {
      const eCount = db.enrollments.filter(e => e.courseId === course.id).length;
      return {
        courseTitle: course.title,
        count: eCount
      };
    }).sort((a,b) => b.count - a.count).slice(0, 5); 

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

// 8. 위험군 학생 리스트 조회 (Admin Only)
app.get('/api/admin/risk-students', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const db = readDB();
    const riskStudents = [];

    // 임의의 AI 알고리즘 적용 (Rule-based Mock)
    db.enrollments.forEach(enroll => {
      const user = db.users.find(u => u.id === enroll.userId);
      const logs = enroll.attentionLogs || [];
      const course = db.courses.find(c => c.id === enroll.courseId);
      
      const seekCount = logs.filter(l => l.eventType === 'seek_backward').length;
      const pauseCount = logs.filter(l => l.eventType === 'pause').length;
      const speedUpCount = logs.filter(l => l.eventType === 'speed_up').length;

      let riskLevel = 'Low';
      let aiSummary = '';

      if (seekCount >= 3 || pauseCount >= 5) {
        riskLevel = 'High';
        aiSummary = `최근 시청 중 되감기 ${seekCount}회, 일시정지 ${pauseCount}회가 발생했습니다. 집중력이 크게 저하된 상태로 보여 즉각적인 멘토링이 권장됩니다.`;
      } else if (seekCount >= 1 || speedUpCount >= 2) {
        riskLevel = 'Medium';
        aiSummary = `배속 재생 ${speedUpCount}회 및 산발적인 일시정지가 포착되었습니다. 학습 동기 부여가 필요할 수 있습니다.`;
      } else {
        return; // Low risk는 조회 목록에서 제외 (임시)
      }

      riskStudents.push({
        id: `${user.id}_${course.id}`,
        userName: user.name,
        userEmail: user.email,
        courseName: course.title,
        riskLevel,
        aiSummary,
        lastActive: logs.length > 0 ? logs[logs.length-1].timestamp : enroll.enrolledAt
      });
    });

    res.json({ success: true, riskStudents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. 관리자 개입 액션 (Admin Only)
app.post('/api/admin/interventions', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { targetId, actionType, message } = req.body;
    // 실제라면 DB에 개입 로그 저장 및 메일 발송/DB 푸시 로직 작동
    console.log(`[Intervention Triggered] Target: ${targetId}, Action: ${actionType}, Message: ${message}`);

    res.json({ success: true, message: '학생에게 해당 조치를 성공적으로 전달했습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
