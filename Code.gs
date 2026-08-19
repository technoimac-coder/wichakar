/**
 * ระบบผลการเรียนและบันทึกคะแนน (ระบบ ซ)
 * โรงเรียนมกุฎเมืองราชวิทยาลัย
 * Google Apps Script Backend (Code.gs)
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("ระบบผลการเรียน โรงเรียนมกุฎเมืองราชวิทยาลัย")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 1. ดึงการตั้งค่าระบบปัจจุบัน
 */
function getSystemSettings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    sheet = ss.insertSheet("Settings");
    sheet.appendRow(["Term", "2"]);
    sheet.appendRow(["Year", "2567"]);
    sheet.appendRow(["Period", "ก่อนกลางภาค"]);
    sheet.appendRow(["Status", "OPEN"]);
  }
  const data = sheet.getDataRange().getValues();
  let settings = {
    term: "2",
    year: "2567",
    period: "ก่อนกลางภาค",
    status: "OPEN"
  };
  data.forEach(row => {
    let key = (row[0] || "").toString().trim().toLowerCase();
    let val = (row[1] || "").toString().trim();
    if (key === "term") settings.term = val;
    if (key === "year") settings.year = val;
    if (key === "period") settings.period = val;
    if (key === "status") settings.status = val;
  });
  return settings;
}

/**
 * 2. เปลี่ยนสถานะ เปิด/ปิด ระบบ
 */
function setSystemStatus(newStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Settings");
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if ((data[i][0] || "").toString().trim().toLowerCase() === "status") {
        sheet.getRange(i + 1, 2).setValue(newStatus);
        return { success: true, status: newStatus };
      }
    }
    sheet.appendRow(["Status", newStatus]);
  }
  return { success: true, status: newStatus };
}

/**
 * 3. ตั้งค่าเทอม / ปีการศึกษา / ช่วงเวลา
 */
function updateSystemTermYear(term, year, period) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Settings");
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    let foundTerm = false, foundYear = false, foundPeriod = false;
    for (let i = 0; i < data.length; i++) {
      let k = (data[i][0] || "").toString().trim().toLowerCase();
      if (k === "term") { sheet.getRange(i + 1, 2).setValue(term); foundTerm = true; }
      if (k === "year") { sheet.getRange(i + 1, 2).setValue(year); foundYear = true; }
      if (k === "period") { sheet.getRange(i + 1, 2).setValue(period); foundPeriod = true; }
    }
    if (!foundTerm) sheet.appendRow(["Term", term]);
    if (!foundYear) sheet.appendRow(["Year", year]);
    if (!foundPeriod) sheet.appendRow(["Period", period]);
  }
  return {
    success: true,
    term: term,
    year: year,
    period: period,
    message: "บันทึกการตั้งค่าภาคเรียนเรียบร้อยแล้ว"
  };
}

/**
 * 4. ตรวจสอบการเข้าสู่ระบบ (Login)
 */
function checkLogin(username, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Teachers");
  if (!sheet) return { success: false, message: "ไม่พบฐานข้อมูลครู (Sheet Teachers)" };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    let u = (data[i][0] || "").toString().trim().toUpperCase();
    let p = (data[i][1] || "").toString().trim();
    let name = (data[i][2] || "").toString().trim();
    let role = (data[i][4] || "Teacher").toString().trim();
    
    if (u === username.toString().trim().toUpperCase() && p === password.toString().trim()) {
      let mustChange = (p === "Password@123" || p === "1234");
      return {
        success: true,
        name: name,
        role: role,
        advisorRoom: (data[i][3] || "").toString().trim(),
        mustChangePassword: mustChange
      };
    }
  }
  return { success: false, message: "รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง" };
}

/**
 * ดึงรายชื่อบัญชีครูและสถานะรหัสผ่าน
 */
function getTeacherAccounts() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Teachers");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  let teachers = [];
  for (let i = 1; i < data.length; i++) {
    let u = (data[i][0] || "").toString().trim();
    let p = (data[i][1] || "").toString().trim();
    let name = (data[i][2] || "").toString().trim();
    let adv = (data[i][3] || "").toString().trim();
    let role = (data[i][4] || "Teacher").toString().trim();
    if (u && name) {
      teachers.push({
        username: u,
        name: name,
        advisorRoom: adv,
        role: role,
        isDefaultPassword: (p === "Password@123" || p === "1234") ? 1 : 0
      });
    }
  }
  return teachers;
}

/**
 * รีเซ็ตรหัสผ่านของครูเป็น Password@123
 */
function resetTeacherPassword(username) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Teachers");
  if (!sheet) return { success: false, message: "ไม่พบแผ่นงาน Teachers" };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    let u = (data[i][0] || "").toString().trim();
    if (u.toUpperCase() === username.toString().trim().toUpperCase()) {
      sheet.getRange(i + 1, 2).setValue("Password@123");
      return { success: true, message: "รีเซ็ตรหัสผ่านของ " + username + " เป็น Password@123 เรียบร้อยแล้ว" };
    }
  }
  return { success: false, message: "ไม่พบบัญชีผู้ใช้นี้" };
}

/**
 * 5. ดึงรายชื่อวิชาที่ครูท่านนี้สอน
 */
function getTeacherSubjects(teacherName, teacherId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const loadSheet = ss.getSheetByName("TeachingLoad");
  const clubSheet = ss.getSheetByName("ClubTeachers");
  const settings = getSystemSettings();
  
  let subjects = [];
  
  if (loadSheet) {
    const data = loadSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let tName = (data[i][0] || "").toString().trim();
      let sCode = (data[i][1] || "").toString().trim();
      let sName = (data[i][2] || "").toString().trim();
      let sLvl = (data[i][3] || "").toString().trim();
      let sRoom = (data[i][4] || "").toString().trim();
      let sTerm = (data[i][5] || "").toString().trim();
      let sYear = (data[i][6] || "").toString().trim();
      
      let matchTeacher = tName.toLowerCase().includes(teacherName.toLowerCase()) || 
                         teacherName.toLowerCase().includes(tName.toLowerCase());
      let matchTerm = (sTerm === settings.term && sYear === settings.year);
      
      if (matchTeacher && matchTerm) {
        subjects.push({
          subjectCode: sCode,
          subjectName: sName,
          classLevel: sLvl,
          room: sRoom,
          teacher: tName
        });
      }
    }
  }

  // จิตอาสา (สำหรับครูที่ปรึกษาประจำห้อง)
  const teacherSheet = ss.getSheetByName("Teachers");
  if (teacherSheet) {
    const tData = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < tData.length; i++) {
      let tUser = (tData[i][0] || "").toString().trim();
      let tFullName = (tData[i][2] || "").toString().trim();
      let advRoom = (tData[i][3] || "").toString().trim();
      
      let matchUser = (teacherId && tUser.toUpperCase() === teacherId.toUpperCase()) || 
                      (tFullName.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(tFullName.toLowerCase()));
      
      if (matchUser && advRoom) {
        let roomTokens = advRoom.split(',');
        roomTokens.forEach(rt => {
          rt = rt.trim();
          if (rt) {
            let advLvl = "ม.1";
            let advR = rt;
            if (rt.includes('/')) {
              let p = rt.split('/');
              advLvl = p[0].trim();
              advR = p[1].trim();
            }
            subjects.push({
              subjectCode: "VOLUNTEER",
              subjectName: "จิตอาสา (กิจกรรมเพื่อสังคมและสาธารณประโยชน์) " + advLvl + "/" + advR,
              classLevel: advLvl,
              room: advR,
              teacher: tFullName
            });
          }
        });
      }
    }
  }

  // ชุมนุม
  if (clubSheet) {
    const clubData = clubSheet.getDataRange().getValues();
    for (let i = 1; i < clubData.length; i++) {
      let tName = (clubData[i][0] || "").toString().trim();
      let cName = (clubData[i][1] || "").toString().trim();
      let cTerm = (clubData[i][2] || "").toString().trim();
      let cYear = (clubData[i][3] || "").toString().trim();
      
      let matchTeacher = tName.toLowerCase().includes(teacherName.toLowerCase()) || 
                         teacherName.toLowerCase().includes(tName.toLowerCase());
      let matchTerm = (cTerm === settings.term && cYear === settings.year);
      
      if (matchTeacher && matchTerm) {
        subjects.push({
          subjectCode: "CLUB",
          subjectName: cName,
          classLevel: "รวม",
          room: cName,
          teacher: tName
        });
      }
    }
  }

  return subjects;
}

/**
 * 6. ดึงรายชื่อนักเรียนในห้อง/ชุมนุม พร้อมคะแนนที่เคยบันทึกไว้
 */
function getStudentsByRoom(classLevel, room, term, year, subjectCode, period) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let students = [];
  
  if (subjectCode === "CLUB") {
    const clubSheet = ss.getSheetByName("ClubStudents");
    if (clubSheet) {
      const data = clubSheet.getDataRange().getValues();
      let count = 1;
      for (let i = 1; i < data.length; i++) {
        let cName = (data[i][0] || "").toString().trim();
        if (cName === room) {
          students.push({
            no: count++,
            id: (data[i][1] || "").toString().trim(),
            name: (data[i][2] || "").toString().trim(),
            level: (data[i][3] || "").toString().trim(),
            room: (data[i][4] || "").toString().trim(),
            status: "ปกติ"
          });
        }
      }
    }
  } else {
    const studentSheet = ss.getSheetByName("Students");
    if (studentSheet) {
      const data = studentSheet.getDataRange().getValues();
      let cleanLevel = classLevel.toString().replace(/[ม\.]/g, "").trim();
      for (let i = 1; i < data.length; i++) {
        let sNo = data[i][0];
        let sId = (data[i][1] || "").toString().trim();
        let sName = (data[i][2] || "").toString().trim();
        let sLvl = (data[i][3] || "").toString().replace(/[ม\.]/g, "").trim();
        let sRoom = (data[i][4] || "").toString().trim();
        
        if (sLvl === cleanLevel && sRoom === room.toString().trim()) {
          students.push({
            no: sNo || (students.length + 1),
            id: sId,
            name: sName,
            level: classLevel,
            room: room,
            s1: "", s2: "", s3: "", s4: "", s5: "", s6: "", s7: "", s8: "", s9: "", s10: "",
            status: "ปกติ"
          });
        }
      }
    }
  }

  // ดึงคะแนนเดิมจาก Sheet Grades
  const gradeSheet = ss.getSheetByName("Grades");
  if (gradeSheet && students.length > 0) {
    const gData = gradeSheet.getDataRange().getValues();
    let gradeMap = {};
    for (let i = 1; i < gData.length; i++) {
      let gTerm = (gData[i][0] || "").toString().trim();
      let gYear = (gData[i][1] || "").toString().trim();
      let gPeriod = (gData[i][2] || "").toString().trim();
      let gSubj = (gData[i][3] || "").toString().trim();
      let gId = (gData[i][7] || "").toString().trim();
      
      if (gTerm === term.toString() && gYear === year.toString() && 
          gPeriod === period.toString() && gSubj === subjectCode.toString()) {
        gradeMap[gId] = {
          s1: gData[i][9], s2: gData[i][10], s3: gData[i][11], s4: gData[i][12], s5: gData[i][13],
          s6: gData[i][14], s7: gData[i][15], s8: gData[i][16], s9: gData[i][17], s10: gData[i][18],
          status: (gData[i][19] || "ปกติ").toString().trim()
        };
      }
    }

    students.forEach(st => {
      if (gradeMap[st.id]) {
        Object.assign(st, gradeMap[st.id]);
      }
    });
  }

  return students;
}

/**
 * 7. บันทึกคะแนนลง Sheet Grades
 */
function saveGradesToSheet(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Grades");
  if (!sheet) {
    sheet = ss.insertSheet("Grades");
    sheet.appendRow([
      "Term", "Year", "Period", "SubjectCode", "SubjectName", 
      "ClassLevel", "Room", "StudentID", "StudentName", "S1", 
      "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", 
      "Status", "TeacherName", "Timestamp"
    ]);
  }

  const { term, year, period, subjectCode, subjectName, classLevel, room, teacher, students } = payload;
  const data = sheet.getDataRange().getValues();
  
  // ลบข้อมูลเดิมของวิชานี้ ห้องนี้ เทอมนี้ ช่วงเวลานี้
  let rowsToKeep = [];
  rowsToKeep.push(data[0]); // header
  for (let i = 1; i < data.length; i++) {
    let rTerm = (data[i][0] || "").toString().trim();
    let rYear = (data[i][1] || "").toString().trim();
    let rPeriod = (data[i][2] || "").toString().trim();
    let rCode = (data[i][3] || "").toString().trim();
    let rRoom = (data[i][6] || "").toString().trim();
    
    let isSame = (rTerm === term.toString() && rYear === year.toString() &&
                  rPeriod === period.toString() && rCode === subjectCode.toString() &&
                  rRoom === room.toString());
    if (!isSame) {
      rowsToKeep.push(data[i]);
    }
  }

  // เพิ่มข้อมูลใหม่
  let now = new Date().toLocaleString("th-TH");
  students.forEach(st => {
    rowsToKeep.push([
      term, year, period, subjectCode, subjectName,
      classLevel, room, st.id, st.name, st.s1 || "",
      st.s2 || "", st.s3 || "", st.s4 || "", st.s5 || "", st.s6 || "",
      st.s7 || "", st.s8 || "", st.s9 || "", st.s10 || "",
      st.status || "ปกติ", teacher || "", now
    ]);
  });

  sheet.clearContents();
  if (rowsToKeep.length > 0) {
    sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
  }

  return "บันทึกผลการประเมินคะแนน " + subjectCode + " (ห้อง " + room + ") เรียบร้อยแล้ว";
}

/**
 * 8. ดึงตัวกรองสำหรับรายงาน (Filters)
 */
function getReportFilters() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const loadSheet = ss.getSheetByName("TeachingLoad");
  let terms = new Set();
  let levels = new Set();
  let roomsByLevel = {};

  if (loadSheet) {
    const data = loadSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let lvl = (data[i][3] || "").toString().trim();
      let room = (data[i][4] || "").toString().trim();
      let t = (data[i][5] || "").toString().trim();
      let y = (data[i][6] || "").toString().trim();
      
      if (t && y) terms.add(t + "/" + y);
      if (lvl) {
        levels.add(lvl);
        if (!roomsByLevel[lvl]) roomsByLevel[lvl] = new Set();
        if (room) roomsByLevel[lvl].add(room);
      }
    }
  }

  let finalRooms = {};
  for (let l in roomsByLevel) {
    finalRooms[l] = Array.from(roomsByLevel[l]).sort((a, b) => a - b);
  }

  return {
    terms: Array.from(terms),
    levels: Array.from(levels).sort(),
    roomsByLevel: finalRooms
  };
}

/**
 * 9. ดึงรายงานผลการเรียน Matrix
 */
function getMatrixReport(period, termYear, level, room) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const [term, year] = termYear.split("/");
  const cleanLevel = level.replace(/[ม\.]/g, "").trim();

  const loadSheet = ss.getSheetByName("TeachingLoad");
  const studentSheet = ss.getSheetByName("Students");
  const gradeSheet = ss.getSheetByName("Grades");
  
  if (!loadSheet || !studentSheet) {
    return { success: false, message: "ไม่พบข้อมูลภาระงานสอนหรือข้อมูลนักเรียน" };
  }

  // หาห้องที่ต้องการ
  let targetRooms = [];
  if (room === "all") {
    let allRooms = new Set();
    const lData = loadSheet.getDataRange().getValues();
    for (let i = 1; i < lData.length; i++) {
      let l = (lData[i][3] || "").toString().replace(/[ม\.]/g, "").trim();
      let r = (lData[i][4] || "").toString().trim();
      let t = (lData[i][5] || "").toString().trim();
      let y = (lData[i][6] || "").toString().trim();
      if (l === cleanLevel && t === term && y === year && r) {
        allRooms.add(r);
      }
    }
    targetRooms = Array.from(allRooms).sort((a, b) => a - b);
  } else {
    targetRooms = [room];
  }

  let reports = [];

  targetRooms.forEach(curRoom => {
    // 1. ดึงวิชาในห้องนี้
    let subjects = [];
    let seenCodes = new Set();
    const lData = loadSheet.getDataRange().getValues();
    for (let i = 1; i < lData.length; i++) {
      let tName = (lData[i][0] || "").toString().trim();
      let sCode = (lData[i][1] || "").toString().trim();
      let sName = (lData[i][2] || "").toString().trim();
      let l = (lData[i][3] || "").toString().replace(/[ม\.]/g, "").trim();
      let r = (lData[i][4] || "").toString().trim();
      let t = (lData[i][5] || "").toString().trim();
      let y = (lData[i][6] || "").toString().trim();
      
      if (l === cleanLevel && r === curRoom && t === term && y === year) {
        if (!seenCodes.has(sCode)) {
          seenCodes.add(sCode);
          subjects.push({
            code: sCode,
            name: sName,
            teacher: tName
          });
        }
      }
    }

    // 2. ดึงนักเรียนในห้องนี้
    let students = [];
    const sData = studentSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      let sNo = sData[i][0];
      let sId = (sData[i][1] || "").toString().trim();
      let sName = (sData[i][2] || "").toString().trim();
      let l = (sData[i][3] || "").toString().replace(/[ม\.]/g, "").trim();
      let r = (sData[i][4] || "").toString().trim();
      
      if (l === cleanLevel && r === curRoom) {
        students.push({
          no: sNo || (students.length + 1),
          id: sId,
          name: sName
        });
      }
    }

    // 3. ดึงผลคะแนน
    let grades = {};
    let activities = {};
    if (gradeSheet) {
      const gData = gradeSheet.getDataRange().getValues();
      for (let i = 1; i < gData.length; i++) {
        let gTerm = (gData[i][0] || "").toString().trim();
        let gYear = (gData[i][1] || "").toString().trim();
        let gPeriod = (gData[i][2] || "").toString().trim();
        let gSubj = (gData[i][3] || "").toString().trim();
        let gRoom = (gData[i][6] || "").toString().trim();
        let gId = (gData[i][7] || "").toString().trim();
        let gStatus = (gData[i][19] || "").toString().trim();
        
        if (gTerm === term && gYear === year && gPeriod === period && gRoom === curRoom) {
          if (gSubj === "ACT99") {
            activities[gId] = {
              s1: gData[i][9],
              s2: gData[i][10],
              s3: gData[i][11],
              s4: gData[i][12]
            };
          } else {
            grades[gId + "_" + gSubj] = gStatus;
          }
        }
      }
    }

    reports.push({
      room: curRoom,
      subjects: subjects,
      students: students,
      grades: grades,
      activities: activities
    });
  });

  return { success: true, reports: reports };
}

/**
 * 10. ดึงรายงานนักเรียนที่ติด "ซ" แยกตามครูผู้สอนและรายวิชา (NEW)
 */
function getTeacherRemedialReport(period, termYear, teacherFilter) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const [term, year] = termYear.split("/");
  
  const loadSheet = ss.getSheetByName("TeachingLoad");
  const gradeSheet = ss.getSheetByName("Grades");
  const studentSheet = ss.getSheetByName("Students");
  
  if (!gradeSheet) {
    return { success: false, message: "ยังไม่มีข้อมูลการบันทึกคะแนนในระบบ" };
  }

  const gData = gradeSheet.getDataRange().getValues();
  let remedialList = [];
  let teacherStats = {};

  // ค้นหารายการที่ติด ซ (หรือ มส, มผ)
  for (let i = 1; i < gData.length; i++) {
    let gTerm = (gData[i][0] || "").toString().trim();
    let gYear = (gData[i][1] || "").toString().trim();
    let gPeriod = (gData[i][2] || "").toString().trim();
    let gCode = (gData[i][3] || "").toString().trim();
    let gSubjName = (gData[i][4] || "").toString().trim();
    let gLvl = (gData[i][5] || "").toString().trim();
    let gRoom = (gData[i][6] || "").toString().trim();
    let gId = (gData[i][7] || "").toString().trim();
    let gName = (gData[i][8] || "").toString().trim();
    let gStatus = (gData[i][19] || "").toString().trim();
    let gTeacher = (gData[i][20] || "").toString().trim();

    if (gTerm === term && gYear === year && gPeriod === period) {
      if (gStatus === "ซ" || gStatus === "มส" || gStatus === "มผ") {
        
        let matchTeacher = true;
        if (teacherFilter && teacherFilter !== "ALL") {
          matchTeacher = gTeacher.toLowerCase().includes(teacherFilter.toLowerCase()) ||
                         teacherFilter.toLowerCase().includes(gTeacher.toLowerCase());
        }

        if (matchTeacher) {
          remedialList.push({
            teacher: gTeacher || "ไม่ระบุครูผู้สอน",
            subjectCode: gCode,
            subjectName: gSubjName,
            level: gLvl,
            room: gRoom,
            studentId: gId,
            studentName: gName,
            status: gStatus
          });

          let tKey = gTeacher || "ไม่ระบุครูผู้สอน";
          if (!teacherStats[tKey]) {
            teacherStats[tKey] = {
              teacherName: tKey,
              totalFail: 0,
              subjects: {}
            };
          }
          teacherStats[tKey].totalFail++;
          
          let sKey = gCode + " - " + gSubjName;
          if (!teacherStats[tKey].subjects[sKey]) {
            teacherStats[tKey].subjects[sKey] = 0;
          }
          teacherStats[tKey].subjects[sKey]++;
        }
      }
    }
  }

  return {
    success: true,
    data: remedialList,
    stats: Object.values(teacherStats),
    totalCount: remedialList.length
  };
}

/**
 * 11. ดึงรายชื่อครูทั้งหมดสำหรับ Datalist & Dropdown
 */
function getTeacherNames() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Teachers");
  let names = [];
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let name = (data[i][2] || "").toString().trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names.sort();
}

/**
 * 12. ติดตามรายวิชาที่ยังไม่ส่งคะแนน
 */
function getMissingGradesReport(period, term, year) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const loadSheet = ss.getSheetByName("TeachingLoad");
  const gradeSheet = ss.getSheetByName("Grades");
  
  if (!loadSheet) return { data: [], totalMissing: 0 };
  
  let submittedSet = new Set();
  if (gradeSheet) {
    const gData = gradeSheet.getDataRange().getValues();
    for (let i = 1; i < gData.length; i++) {
      let gTerm = (gData[i][0] || "").toString().trim();
      let gYear = (gData[i][1] || "").toString().trim();
      let gPeriod = (gData[i][2] || "").toString().trim();
      let gCode = (gData[i][3] || "").toString().trim();
      let gRoom = (gData[i][6] || "").toString().trim();
      
      if (gTerm === term && gYear === year && gPeriod === period) {
        submittedSet.add(gCode + "_" + gRoom);
      }
    }
  }

  const lData = loadSheet.getDataRange().getValues();
  let missingByTeacher = {};
  let totalMissing = 0;

  for (let i = 1; i < lData.length; i++) {
    let tName = (lData[i][0] || "").toString().trim();
    let sCode = (lData[i][1] || "").toString().trim();
    let sName = (lData[i][2] || "").toString().trim();
    let sLvl = (lData[i][3] || "").toString().trim();
    let sRoom = (lData[i][4] || "").toString().trim();
    let sTerm = (lData[i][5] || "").toString().trim();
    let sYear = (lData[i][6] || "").toString().trim();
    
    if (sTerm === term && sYear === year) {
      let key = sCode + "_" + sRoom;
      if (!submittedSet.has(key)) {
        if (!missingByTeacher[tName]) {
          missingByTeacher[tName] = {
            teacherName: tName,
            subjects: []
          };
        }
        missingByTeacher[tName].subjects.push({
          subjectCode: sCode,
          subjectName: sName,
          classLevel: sLvl,
          room: sRoom
        });
        totalMissing++;
      }
    }
  }

  return {
    data: Object.values(missingByTeacher),
    totalMissing: totalMissing
  };
}

/**
 * 13. ตรวจสอบภาระงานสอนที่มีในระบบ
 */
function getExistingTeachingLoad(term, year) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("TeachingLoad");
  let list = [];
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let t = (data[i][5] || "").toString().trim();
      let y = (data[i][6] || "").toString().trim();
      if (t === term && y === year) {
        list.push({
          teacher: (data[i][0] || "").toString().trim(),
          code: (data[i][1] || "").toString().trim(),
          name: (data[i][2] || "").toString().trim(),
          level: (data[i][3] || "").toString().trim(),
          room: (data[i][4] || "").toString().trim()
        });
      }
    }
  }
  return list;
}

/**
 * 14. บันทึกข้อมูลตารางต่างๆ จากหน้าเว็บ
 */
function saveDatabaseWeb(type, data, overwrite) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheetName = type === "teachingLoad" ? "TeachingLoad" : 
                  (type === "teachers" ? "Teachers" : "ClubTeachers");
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) sheet = ss.insertSheet(sheetName);
  
  if (overwrite) {
    sheet.clearContents();
    if (type === "teachingLoad") {
      sheet.appendRow(["ชื่อครูผู้สอน", "รหัสวิชา", "ชื่อรายวิชา", "ระดับชั้น", "ห้อง", "ภาคเรียน", "ปีการศึกษา"]);
    } else if (type === "teachers") {
      sheet.appendRow(["Username", "Password", "ชื่อ-นามสกุล", "ห้องที่ปรึกษา", "สิทธิ์"]);
    } else if (type === "clubTeachers") {
      sheet.appendRow(["ชื่อครูประจำชุมนุม", "ชื่อชุมนุม", "ภาคเรียน", "ปีการศึกษา"]);
    }
  }

  if (data && data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
  }
  
  return "บันทึกข้อมูลตาราง " + sheetName + " เรียบร้อยแล้ว (" + data.length + " รายการ)";
}

/**
 * 15. อัปโหลดรายชื่อนักเรียนชุมนุม
 */
function uploadClubStudents(data, overwrite) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("ClubStudents");
  if (!sheet) sheet = ss.insertSheet("ClubStudents");
  
  if (overwrite) {
    sheet.clearContents();
    sheet.appendRow(["ชื่อชุมนุม", "รหัสประจำตัว", "ชื่อ-สกุล", "ระดับชั้น", "ห้อง"]);
  }

  if (data && data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
  }
  
  return "อัปโหลดรายชื่อนักเรียนชุมนุมเรียบร้อยแล้ว (" + data.length + " รายการ)";
}

function changePassword(username, oldPassword, newPassword) {
  if (!username || !newPassword) return { success: false, message: "กรุณากรอกรหัสผ่านใหม่" };
  if (newPassword.length < 6) return { success: false, message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
  if (newPassword === "Password@123" || newPassword === "1234") return { success: false, message: "กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่รหัสผ่านเริ่มต้น" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Teachers");
  if (!sheet) return { success: false, message: "ไม่พบแผ่นงาน Teachers" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toUpperCase() === username.toString().trim().toUpperCase()) {
      sheet.getRange(i + 1, 2).setValue(newPassword);
      return { success: true, message: "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว" };
    }
  }
  return { success: false, message: "ไม่พบผู้ใช้นี้ในระบบ" };
}
