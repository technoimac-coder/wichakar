/**
 * HostAtom API Adapter: เชื่อมต่อ API PHP + MySQL แทน google.script.run
 */
window.google = {
  script: {
    run: {
      withSuccessHandler: function(successFn) {
        var obj = Object.create(this);
        obj._success = successFn;
        return obj;
      },
      withFailureHandler: function(failFn) {
        var obj = Object.create(this);
        obj._fail = failFn;
        return obj;
      },
      _call: function(action, data) {
        var self = this;
        fetch("api.php?action=" + action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data || {})
        })
        .then(function(res) { return res.json(); })
        .then(function(json) {
          if (self._success) self._success(json);
        })
        .catch(function(err) {
          if (self._fail) self._fail(err);
          else {
            console.error("API Error (" + action + "):", err);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + err.message);
          }
        });
      },
      getSystemSettings: function() { this._call("getSystemSettings"); },
      setSystemStatus: function(status) { this._call("setSystemStatus", { status: status }); },
      updateSystemTermYear: function(term, year, period) { this._call("updateSystemTermYear", { term: term, year: year, period: period }); },
      checkLogin: function(username, password) { this._call("checkLogin", { username: username, password: password }); },
      changePassword: function(username, oldPassword, newPassword) { this._call("changePassword", { username: username, oldPassword: oldPassword, newPassword: newPassword }); },
      getTeacherSubjects: function(teacherName, teacherId) { this._call("getTeacherSubjects", { teacherName: teacherName, teacherId: teacherId }); },
      getStudentsByRoom: function(classLevel, room, term, year, subjectCode, period) { this._call("getStudentsByRoom", { classLevel: classLevel, room: room, term: term, year: year, subjectCode: subjectCode, period: period }); },
      saveGradesToSheet: function(data) { this._call("saveGradesToSheet", data); },
      getReportFilters: function() { this._call("getReportFilters"); },
      getMatrixReport: function(period, term, level, room) { this._call("getMatrixReport", { period: period, term: term, level: level, room: room }); },
      getTeacherRemedialReport: function(period, termYear, teacherFilter) { this._call("getTeacherRemedialReport", { period: period, termYear: termYear, teacherFilter: teacherFilter }); },
      getTeacherNames: function() { this._call("getTeacherNames"); },
      getMissingGradesReport: function(period, term, year) { this._call("getMissingGradesReport", { period: period, term: term, year: year }); },
      getExistingTeachingLoad: function(term, year) { this._call("getExistingTeachingLoad", { term: term, year: year }); },
      saveDatabaseWeb: function(type, data, overwrite) { this._call("saveDatabaseWeb", { type: type, data: data, overwrite: overwrite }); },
      uploadClubStudents: function(data, overwrite) { this._call("uploadClubStudents", { data: data, overwrite: overwrite }); },
      uploadStudents: function(data, overwrite) { this._call("uploadStudents", { data: data, overwrite: overwrite }); },
      getTeacherAccounts: function() { this._call("getTeacherAccounts"); },
      resetTeacherPassword: function(username) { this._call("resetTeacherPassword", { username: username }); },
      submitScoreCopy: function(data) { this._call("submitScoreCopy", data); },
      adminGetSubmissions: function(term, year, period) { this._call("adminGetSubmissions", { term: term, year: year, period: period }); },
      adminUpdateSubmission: function(term, year, period, subjectCode, room, status, rejectReason) { this._call("adminUpdateSubmission", { term: term, year: year, period: period, subjectCode: subjectCode, room: room, status: status, rejectReason: rejectReason }); }
    }
  }
};
