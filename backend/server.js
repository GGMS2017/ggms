const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');

const seedDB = require('./seed');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Message = require('./models/Message');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-starfish-key';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/starfish'; // Fallback to localhost for dev

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB via Mongoose');
    await seedDB();
  })
  .catch(err => console.error('MongoDB connection error:', err));

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

// 0-0. 회원가입 엔드포인트
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: '이름, 이메일, 비밀번호는 필수입니다.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });

    const bcrypt = require('bcryptjs');
    const hashedPw = await bcrypt.hash(password, 10);
    const newUser = new User({
      id: `user_${Date.now()}`,
      email,
      password: hashedPw,
      name,
      role: 'student'
    });
    await newUser.save();

    res.json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 0. 로그인 엔드포인트
app.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
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
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 단일 코스 조회
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findOne({ id: req.params.id });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// 2-1. 수강 신청 (새로 추가됨)
app.post('/api/enroll', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findOne({ id: courseId });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = await Enrollment.findOne({ userId: req.user.id, courseId });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });

    const newEnrollment = new Enrollment({
      id: `enroll_${req.user.id}_${courseId}_${Date.now()}`,
      userId: req.user.id,
      courseId: courseId,
      progress: {
        completedLectures: [],
        totalLectures: course.curriculum.reduce((acc, c) => acc + c.lectures.length, 0)
      },
      attentionLogs: []
    });

    await newEnrollment.save();
    res.json({ success: true, enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2-1-5. 비밀번호 변경 (Protected)
app.put('/api/user/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호는 필수입니다.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다.' });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 시드 데이터 유저(비밀번호 없음)는 any password로 허용
    if (user.password) {
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const bcrypt = require('bcryptjs');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2-1-8. 마이페이지 수강 통계 조회 (Protected)
app.get('/api/user/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const enrollments = await Enrollment.find({ userId });

    let studyingCount = 0;
    let completedCount = 0;
    let totalLearningSeconds = 0;

    for (const enroll of enrollments) {
      const course = await Course.findOne({ id: enroll.courseId });
      if (!course) continue;
      const totalLectures = course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0);
      const completed = (enroll.progress?.completedLectures || []).length;

      if (completed >= totalLectures && totalLectures > 0) {
        completedCount++;
      } else {
        studyingCount++;
      }

      // 강의별 저장된 시청 위치(positions) 합산
      const positions = enroll.progress?.positions || {};
      for (const time of Object.values(positions)) {
        totalLearningSeconds += (typeof time === 'number' ? time : 0);
      }
    }

    res.json({
      success: true,
      stats: {
        studyingCount,
        completedCount,
        totalLearningHours: parseFloat((totalLearningSeconds / 3600).toFixed(1))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2-2. 마이페이지 프로필 수정 (새로 추가됨)
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { name, email },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // update password manually if needed via a different route later, this serves basic info
    res.json({ success: true, user: user.toObject() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 내 수강 현황 조회 (Protected)
app.get('/api/enrollments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const myEnrollments = await Enrollment.find({ userId });
    
    const result = [];
    for (const enroll of myEnrollments) {
      const course = await Course.findOne({ id: enroll.courseId });
      if (course) {
        result.push({ ...enroll.toObject(), course: course.toObject() });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 수강 동영상 진행률 저장 (Progress) - 주기적 호출 (Protected)
app.post('/api/enrollments/:courseId/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { lectureId, currentTime } = req.body;

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) return res.status(404).json({ error: '수강 중인 강의가 아닙니다.' });

    let positions = enrollment.get('progress.positions') || {};
    
    positions[lectureId] = Math.max(positions[lectureId] || 0, currentTime);
    
    enrollment.set('progress.positions', positions);
    enrollment.markModified('progress.positions');
    await enrollment.save();
    
    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 단일 강의 수강 완료 처리 (Protected)
app.post('/api/enrollments/:courseId/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { lectureId } = req.body;

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    let currentCompleted = enrollment.get('progress.completedLectures') || [];
    let earnedXP = 0;
    let earnedBadges = [];
    
    if (!currentCompleted.includes(lectureId)) {
      currentCompleted.push(lectureId);
      enrollment.set('progress.completedLectures', currentCompleted);
      await enrollment.save();
      
      const user = await User.findOne({ id: userId });
      if (user) {
        earnedXP = 50;
        user.xp = (user.xp || 0) + earnedXP;
        user.level = Math.floor(user.xp / 100) + 1;

        // 스트릭 업데이트
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (user.lastStudyDate === todayStr) {
          // 오늘 이미 학습함 — streak 유지
        } else if (user.lastStudyDate === yesterdayStr) {
          user.streak = (user.streak || 0) + 1;
        } else {
          user.streak = 1; // 연속이 끊겼으면 리셋
        }
        user.lastStudyDate = todayStr;

        // 배지 자동 부여
        const newBadges = [];
        const totalCompleted = currentCompleted.length;
        if (totalCompleted >= 1 && !user.badges.includes('first_lecture')) newBadges.push('first_lecture');
        if (totalCompleted >= 5 && !user.badges.includes('lecture_5')) newBadges.push('lecture_5');
        if (totalCompleted >= 10 && !user.badges.includes('lecture_10')) newBadges.push('lecture_10');
        if (user.streak >= 3 && !user.badges.includes('streak_3')) newBadges.push('streak_3');
        if (user.streak >= 7 && !user.badges.includes('streak_7')) newBadges.push('streak_7');
        if (user.xp >= 500 && !user.badges.includes('xp_500')) newBadges.push('xp_500');
        if (newBadges.length > 0) user.badges = [...user.badges, ...newBadges];

        await user.save();
        if (newBadges.length > 0) earnedBadges = newBadges;
      }
    }
    
    res.json({ success: true, completedLectures: currentCompleted, earnedXP, earnedBadges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 강의 수강 신청 (Protected)
app.post('/api/enroll', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;

    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) return res.status(400).json({ error: 'Already enrolled' });

    const newDbId = `enroll_${Date.now()}`;
    const newEnrollment = new Enrollment({
      id: newDbId,
      userId,
      courseId,
      progress: { completedLectures: [] }
    });
    newEnrollment.set('attentionLogs', []);
    newEnrollment.set('progress.positions', {});
    
    await newEnrollment.save();

    res.json({ success: true, enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6.5. 수강생 학습 행동 트래킹 이벤트 저장 (Protected)
app.post('/api/enrollments/:courseId/events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { eventType, timestamp, details } = req.body;

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    let logs = enrollment.get('attentionLogs') || [];
    logs.push({
      eventType,
      timestamp: timestamp || new Date().toISOString(),
      details
    });

    enrollment.set('attentionLogs', logs);
    enrollment.markModified('attentionLogs');
    await enrollment.save();
    
    res.json({ success: true, message: 'Event logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. 관리자 통계 조회 API (Protected - Admin Only)
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    
    const courses = await Course.find();
    
    const enrollmentsByCourse = [];
    for (const course of courses) {
      const eCount = await Enrollment.countDocuments({ courseId: course.id });
      enrollmentsByCourse.push({
        courseTitle: course.title,
        count: eCount
      });
    }
    
    enrollmentsByCourse.sort((a,b) => b.count - a.count);

    const users = await User.find();

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        enrollmentsByCourse: enrollmentsByCourse.slice(0, 5)
      },
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. 위험군 학생 리스트 조회 (Admin Only)
app.get('/api/admin/risk-students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const enrollments = await Enrollment.find();
    let studentsToAnalyze = [];

    for (const enroll of enrollments) {
      const logs = enroll.get('attentionLogs') || [];
      const seekCount = logs.filter(l => l.eventType === 'seek_backward').length;
      const pauseCount = logs.filter(l => l.eventType === 'pause').length;
      const speedUpCount = logs.filter(l => l.eventType === 'speed_up').length;

      if (logs.length > 3 || seekCount > 0 || pauseCount > 0) {
        const user = await User.findOne({ id: enroll.userId });
        const course = await Course.findOne({ id: enroll.courseId });
        if (user && course) {
            studentsToAnalyze.push({
              enroll, user: user.toObject(), course: course.toObject(), logs, seekCount, pauseCount, speedUpCount
            });
        }
      }
    }

    const riskStudents = [];

    const analysisPromises = studentsToAnalyze.slice(0, 3).map(async (data) => {
      const { user, course, logs, seekCount, pauseCount, speedUpCount, enroll } = data;
      const progressRates = ((enroll.progress?.completedLectures?.length || 0) / course.curriculum.reduce((acc, cur) => acc + cur.lectures.length, 0) * 100).toFixed(1);

      const prompt = `강의 수강생의 학습 로그 요약 데이터를 바탕으로 해당 학생의 이탈(Drop-out) 혹은 집중력 저하 위험도(Risk Level)를 예측하고, 강사용 브리핑을 2문장으로 작성해주세요.
- 수강생 이름: ${user.name}
- 수강 과목: ${course.title}
- 진도율: ${progressRates}%
- 최근 특이사항: 일시정지 ${pauseCount}회, 뒤로감기 ${seekCount}회, 배속 변경 ${speedUpCount}회 등 잦은 이탈 징후 포착됨.

반드시 다음 형식의 JSON으로만 응답할 것:
{
  "riskLevel": "High" 혹은 "Medium" 중에서 하나,
  "aiSummary": "이 학생은 현재 실습 구간에서 어려움을 겪고 있는 것으로 보이며..." 와 같은 강사용 알림 메시지 (2문장 내외)
}`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          response_format: { type: "json_object" }
        });
        
        const result = JSON.parse(completion.choices[0].message.content);
        
        riskStudents.push({
          id: `${user.id}_${course.id}`,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          courseName: course.title,
          riskLevel: result.riskLevel || 'Medium',
          aiSummary: result.aiSummary || '분석을 요약할 수 없습니다.',
          lastActive: logs.length > 0 ? logs[logs.length-1].timestamp : enroll.createdAt
        });
      } catch (err) {
        console.error("GPT Analysis Error:", err);
      }
    });

    await Promise.all(analysisPromises);

    res.json({ success: true, riskStudents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error occurred during AI analysis.' });
  }
});

// 9. 관리자 개입 액션 — 실제 메시지 DB 저장 (Admin Only)
app.post('/api/admin/interventions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { targetUserId, actionType, message } = req.body;
    if (!targetUserId || !actionType) {
      return res.status(400).json({ error: 'targetUserId, actionType은 필수입니다.' });
    }

    const defaultMsg = actionType === 'mentor'
      ? '강사가 1:1 멘토링을 신청했습니다. 학습 관련 어려움이 있다면 편하게 연락주세요!'
      : '학습 잘 하고 계신가요? 포기하지 말고 조금만 더 힘내세요! 강사 드림 💪';

    const newMsg = new Message({
      id: `msg_${Date.now()}`,
      fromUserId: req.user.id,
      toUserId: targetUserId,
      actionType,
      content: message || defaultMsg
    });
    await newMsg.save();

    res.json({ success: true, message: '학생에게 메시지를 성공적으로 전달했습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9-1. 내 받은 메시지 조회 (Protected)
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ toUserId: req.user.id }).sort({ createdAt: -1 });
    // 읽지 않은 메시지 개수
    const unreadCount = messages.filter(m => !m.isRead).length;
    // 조회 시 전부 읽음 처리
    await Message.updateMany({ toUserId: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true, messages, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. 학생 맞춤형 커리큘럼 추천 (Protected)
app.get('/api/recommendations', authMiddleware, async (req, res) => {
  try {
    const myEnrollments = await Enrollment.find({ userId: req.user.id });
    const enrolledCourseIds = myEnrollments.map(e => e.courseId);
    
    let availableCourses = await Course.find({ id: { $nin: enrolledCourseIds } });
    
    availableCourses = availableCourses.sort(() => 0.5 - Math.random());
    const recommendations = availableCourses.slice(0, 3).map(c => ({
      ...c.toObject(),
      aiReason: '회원님의 최근 학습 패턴과 부족한 스킬셋(예: 클라우드/보안)을 보완하기 위해 AI가 추천합니다.'
    }));

    res.json({ success: true, recommendations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. AI 튜터 챗봇 (Protected)
app.post('/api/ai/chat', authMiddleware, async (req, res) => {
  try {
    const { message, courseId, lectureId, currentTime } = req.body;
    
    const mm = Math.floor(currentTime / 60);
    const ss = Math.floor(currentTime % 60);
    const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

    const course = await Course.findOne({ id: courseId });
    let lectureContext = "";
    if (course) {
      for (const section of course.curriculum) {
        const lec = section.lectures.find(l => l.id === lectureId);
        if (lec) {
          lectureContext = `강의 제목: ${lec.title}\n강의 노트:\n${lec.note || '없음'}`;
          break;
        }
      }
    }

    const systemPrompt = `당신은 Starfish Run 플랫폼의 똑똑하고 친절한 AI 보조 강사입니다.
현재 수강생은 '${course?.title || '알 수 없는 강의'}' 과정의 다음 강의 영상을 시청 중이며 질문을 남겼습니다.
현재 영상 구간은 [${timeStr}] 입니다.

[현재 강의 문맥]
${lectureContext}

수강생의 질문에 대해 강의 노트와 문맥을 참고하여 친절하고 명확하게 답변해주세요. 필요한 경우 타임라인 구간(${timeStr})을 언급하며 조언할 수 있습니다. 3~4문장 내외로 간결하게 답변하세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = completion.choices[0].message.content;
    res.json({ success: true, reply });
  } catch (error) {
    console.error("AI API Error:", error);
    res.status(500).json({ error: error.message || 'AI 튜터 응답 중 오류가 발생했습니다.' });
  }
});

// 12. 게이미피케이션 현황 및 랭킹 조회 (Protected)
app.get('/api/gamification', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findOne({ id: req.user.id });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const students = await User.find({ role: 'student', xp: { $gt: 0 } }).sort({ xp: -1 }).limit(5);

    const rankedUsers = students.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      name: u.name,
      xp: u.xp || 0,
      level: u.level || 1
    }));

    res.json({
      success: true,
      myStats: {
        xp: currentUser.xp || 0,
        level: currentUser.level || 1,
        streak: currentUser.streak || 0,
        badges: currentUser.badges || []
      },
      leaderboard: rankedUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12.5. AI 집중도 퀴즈 생성 (Protected)
app.post('/api/ai/quiz', authMiddleware, async (req, res) => {
  try {
    const { courseId, lectureId } = req.body;

    const course = await Course.findOne({ id: courseId });
    let lectureTitle = '';
    let lectureNote = '';
    if (course) {
      for (const section of course.curriculum) {
        const lec = section.lectures.find(l => l.id === lectureId);
        if (lec) { lectureTitle = lec.title; lectureNote = lec.note || ''; break; }
      }
    }

    const systemPrompt = `다음 강의 내용을 기반으로 학습 집중도를 확인하는 4지선다 퀴즈 1문제를 생성하세요.
강의 제목: ${lectureTitle}
강의 노트 요약: ${lectureNote.replace(/<[^>]*>/g, '').slice(0, 500)}

반드시 다음 JSON 형식으로만 응답:
{
  "question": "질문 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "answerIndex": 0,
  "explanation": "정답 해설 (1~2문장)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const quiz = JSON.parse(completion.choices[0].message.content);
    res.json({ success: true, quiz });
  } catch (error) {
    console.error("AI Quiz Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 13. [학생/강사] AI 실습 채점/리뷰 (Auto-Grader)
app.post('/api/course/grade', authMiddleware, async (req, res) => {
  try {
    const { codeSnippet, assignmentTitle } = req.body;

    const systemPrompt = `당신은 까다롭지만 친절한 코드 리뷰어 및 자동 채점기(Auto-Grader)입니다.
학생이 제출한 다음 코드를 평가해주세요.
과제 제목: ${assignmentTitle || "일반 실습"}
제출된 코드:
${codeSnippet}

반드시 다음 3가지 루브릭에 따라 100점 만점으로 평가하고, 다음의 JSON 형식으로만 응답해야 합니다.
{
  "score": 85,
  "readability": "가독성이 훌륭하나 변수명이 아쉽습니다.",
  "logic": "반복문 내에서 불필요한 연산이 발견되었습니다.",
  "efficiency": "O(n^2)로 동작합니다. Map을 쓰면 O(n) 개선 가능.",
  "oneLineFeedback": "조금만 다듬으면 완벽한 코드가 될 것 같습니다!"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ success: true, result });
  } catch (error) {
    console.error("AI Auto Grader Error:", error);
    res.status(500).json({ error: error.message || '채점 중 오류 발생' });
  }
});

// 14. AI 코스 자동 생성 (Admin Only)
app.post('/api/admin/generate-course', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { prompt } = req.body;
    
    const count = await Course.countDocuments();
    const newCourseNumber = count + 1;
    const newCourseId = `course_${newCourseNumber}`;

    const systemPrompt = `당신은 세계 최고 수준의 IT 전문 강의 기획자입니다.
사용자의 프롬프트: "${prompt}"

위 요청에 맞춰 전문적이고 짜임새 있는 전체 강의 커리큘럼 하나를 생성하세요. 
반드시 다음 JSON 구조를 완벽하게 유지하여 응답하세요. (마크다운 백틱 없이 순수 JSON만 반환)

{
  "title": "강좌 제목 (예: 초보자를 위한 파이썬 자동화 5시간 완성)",
  "instructor": "AI 자동 생성 강좌",
  "thumbnail": "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&q=80&w=800",
  "description": "과정에 대한 상세 설명입니다.",
  "tags": ["기초", "AI생성", "태그2"],
  "curriculum": [
    {
      "title": "섹션 1. 개발 환경 설정 및 기초",
      "id": "section_temp",
      "lectures": [
        {
          "title": "단원 1-1. 파이썬 설치 및 세팅",
          "duration": "15:00",
          "note": "<h3>파이썬의 마법</h3><p>첫 강의입니다. 간단한 HTML 마크다운이 섞인 강의 핵심 이론 노트 초안을 길게 작성하세요.</p>"
        }
      ]
    }
  ]
}
(curriculum은 2개의 섹션과, 각 섹션별 2개의 강의(lecture)로 구성할 것. 총 4개의 강의. 실감나게 실제 강의노트처럼 HTML로 길게 작성.)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const generatedJson = JSON.parse(completion.choices[0].message.content);

    generatedJson.id = newCourseId;
    generatedJson.studentLogs = {};
    
    generatedJson.curriculum.forEach((sec, sIdx) => {
      sec.id = `sec_${newCourseNumber}_${sIdx+1}`;
      sec.lectures.forEach((lec, lIdx) => {
        lec.id = `lec_${newCourseNumber}_${sIdx+1}_${lIdx+1}`;
        lec.type = "video";
      });
    });

    const newCourse = new Course(generatedJson);
    await newCourse.save();

    res.json({ success: true, course: newCourse });
  } catch (error) {
    console.error("AI Course Generation Error:", error);
    res.status(500).json({ error: error.message || '강좌 생성 중 오류 발생' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
