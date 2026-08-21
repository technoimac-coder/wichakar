
window.onerror = function(message, source, lineno, colno, error) {
    const errorBanner = document.createElement("div");
    errorBanner.style.position = "fixed";
    errorBanner.style.top = "0";
    errorBanner.style.left = "0";
    errorBanner.style.width = "100%";
    errorBanner.style.backgroundColor = "#fee2e2";
    errorBanner.style.color = "#991b1b";
    errorBanner.style.padding = "10px";
    errorBanner.style.zIndex = "9999";
    errorBanner.style.fontSize = "12px";
    errorBanner.style.borderBottom = "2px solid #ef4444";
    errorBanner.style.textAlign = "left";
    errorBanner.innerHTML = "<b>[JS Error]:</b> " + message + " at " + source + ":" + lineno + ":" + colno;
    document.body.appendChild(errorBanner);
    console.error("Global JS Error:", message, source, lineno, colno, error);
    return false;
};
window.addEventListener('DOMContentLoaded', () => {
    // Check if Tailwind CSS is loaded (Tailwind v3 injection check)
    setTimeout(() => {
        if (typeof tailwind === 'undefined' && !document.getElementById('tailwind-cdn-style')) {
            const warn = document.createElement('div');
            warn.style.cssText = 'position:fixed;top:0;left:0;width:100%;background-color:#fff3cd;color:#856404;padding:15px;text-align:center;z-index:99999;font-family:sans-serif;font-weight:bold;border-bottom:2px solid #ffeeba;box-shadow:0 2px 10px rgba(0,0,0,0.1);';
            warn.innerHTML = '⚠️ ตรวจพบว่าเบราว์เซอร์โหลดไฟล์ตกแต่งหน้าเว็บ (Tailwind CSS) ล้มเหลว กรุณากดรีเฟรชหน้าจอแบบล้างแคช (Ctrl + F5) หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            document.body.appendChild(warn);
        }
    }, 1000);
});
let currentTeacherId="",currentTeacherName="",currentRole="";
let currentTerm="",currentYear="",currentSystemStatus="OPEN", currentPeriod="ก่อนกลางภาค";
let globalTeacherNames = []; 
let globalReportFilters = null; 
let selectedExcelFile = null; 

function formatTeacherName(name) {
    if(!name) return name;
    let names = name.split(',').map(n => n.trim());
    let formatted = names.map(n => {
        let isEnglish = /^[A-Za-z]/.test(n);
        if (isEnglish) {
            if (!n.toLowerCase().startsWith("teacher") && !n.toLowerCase().startsWith("mr.") && !n.toLowerCase().startsWith("ms.") && !n.toLowerCase().startsWith("miss")) {
                return "Teacher " + n;
            }
            return n;
        } else {
            if (!n.startsWith("ครู") && !n.startsWith("ว่าที่") && !n.startsWith("ผอ.") && !n.startsWith("ดร.")) {
                return "ครู" + n;
            }
            return n;
        }
    });
    return formatted.join(', ');
}

function formatRooms(rooms) {
    let nums = [];
    let nonNums = [];
    rooms.forEach(r => {
        let str = r.toString().trim();
        let num = parseInt(str);
        if (num.toString() === str) {
            nums.push(num);
        } else {
            nonNums.push(str);
        }
    });
    nums.sort((a, b) => a - b);
    
    let ranges = [];
    if (nums.length > 0) {
        let start = nums[0];
        let end = nums[0];
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] === end + 1) {
                end = nums[i];
            } else {
                ranges.push(start === end ? start.toString() : start + "-" + end);
                start = nums[i];
                end = nums[i];
            }
        }
        ranges.push(start === end ? start.toString() : start + "-" + end);
    }
    return [...ranges, ...nonNums].join(', ');
}

window.addEventListener('DOMContentLoaded',()=>{
const savedSession=sessionStorage.getItem('mmv_session');
if(savedSession){
const session=JSON.parse(savedSession);
currentTeacherId=session.id;currentTeacherName=session.name;
currentRole=session.role;currentTerm=session.term;
currentYear=session.year;currentSystemStatus=session.status;
currentPeriod=session.period || "ก่อนกลางภาค";

document.getElementById("loginSection").classList.add("hidden");
const mainApp=document.getElementById("mainAppSection");
mainApp.classList.remove("hidden");mainApp.classList.add("flex");
document.getElementById("navTeacherName").innerText=formatTeacherName(currentTeacherName);
document.getElementById("navTermInfo").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;
document.getElementById("currentTermDisplay").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;

document.getElementById("settingTerm").value = currentTerm;
document.getElementById("settingYear").value = currentYear;
document.getElementById("settingPeriod").value = currentPeriod;

if(currentRole==="Admin"){
    document.getElementById("tabBtnReport").classList.remove("hidden");
    document.getElementById("tabBtnDatabase").classList.remove("hidden");
    document.getElementById("checkTerm").value = currentTerm;
    document.getElementById("checkYear").value = currentYear;
    loadTeacherNamesForDatalist(); 
    renderFormTable();
    loadTeacherAccountsList(); 
}
updateSystemStatusUI();loadSubjects();
if(currentRole==="Admin") loadReportFilters();
}
});

function togglePasswordVisibility() {
    toggleInputVisibility('teacherPin', 'passwordEyeIcon');
}

function toggleInputVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash text-sm text-blue-600';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye text-sm text-gray-400';
    }
}

let pendingLoginUser = null;

function handleLogin(){
const id=document.getElementById("teacherId").value.trim();
const pin=document.getElementById("teacherPin").value.trim();
const btn=document.getElementById("loginBtn");
const errorDiv=document.getElementById("loginError");
if(!id||!pin){document.getElementById("loginErrorText").innerText="กรุณากรอกข้อมูลให้ครบ";errorDiv.classList.remove("hidden");return;}
btn.innerHTML='<div class="loader"></div> กำลังตรวจสอบ...';btn.disabled=true;errorDiv.classList.add("hidden");
google.script.run.withSuccessHandler(function(res){
btn.innerHTML='เข้าสู่ระบบ <i class="fa-solid fa-arrow-right-to-bracket ml-1"></i>';btn.disabled=false;
if(res.success){
    if (res.mustChangePassword) {
        pendingLoginUser = { id: id, pin: pin, res: res };
        const modal = document.getElementById("forceChangePasswordModal");
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        document.getElementById("newTeacherPassword").value = "";
        document.getElementById("confirmTeacherPassword").value = "";
        document.getElementById("changePasswordError").classList.add("hidden");
    } else {
        finishLoginProcess(id, res);
    }
}else{
document.getElementById("loginErrorText").innerText=res.message;
errorDiv.classList.remove("hidden");
}
}).checkLogin(id,pin);
}

function submitForceChangePassword() {
    if (!pendingLoginUser) return;
    const newPass = document.getElementById("newTeacherPassword").value.trim();
    const confPass = document.getElementById("confirmTeacherPassword").value.trim();
    const errDiv = document.getElementById("changePasswordError");
    const errText = document.getElementById("changePasswordErrorText");
    const btn = document.getElementById("btnSaveNewPassword");

    errDiv.classList.add("hidden");

    if (!newPass || !confPass) {
        errText.innerText = "กรุณากรอกรหัสผ่านใหม่ทั้งสองช่อง";
        errDiv.classList.remove("hidden");
        return;
    }
    if (newPass !== confPass) {
        errText.innerText = "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน";
        errDiv.classList.remove("hidden");
        return;
    }
    if (newPass.length < 6) {
        errText.innerText = "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
        errDiv.classList.remove("hidden");
        return;
    }
    if (newPass === "Password@123" || newPass === "1234") {
        errText.innerText = "กรุณาตั้งรหัสผ่านที่ไม่ใช่รหัสผ่านเริ่มต้น (Password@123)";
        errDiv.classList.remove("hidden");
        return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    btn.disabled = true;

    google.script.run.withSuccessHandler(function(chRes) {
        btn.innerHTML = '<i class="fa-solid fa-shield-check mr-1"></i> บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ';
        btn.disabled = false;

        if (chRes.success) {
            const modal = document.getElementById("forceChangePasswordModal");
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            showToast("สำเร็จ", "เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว");
            finishLoginProcess(pendingLoginUser.id, pendingLoginUser.res);
            pendingLoginUser = null;
        } else {
            errText.innerText = chRes.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน";
            errDiv.classList.remove("hidden");
        }
    }).withFailureHandler(function(err) {
        btn.innerHTML = '<i class="fa-solid fa-shield-check mr-1"></i> บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ';
        btn.disabled = false;
        errText.innerText = "เกิดข้อผิดพลาด: " + err.message;
        errDiv.classList.remove("hidden");
    }).changePassword(pendingLoginUser.id, pendingLoginUser.pin, newPass);
}

function finishLoginProcess(id, res) {
currentTeacherId=id.toUpperCase();currentTeacherName=res.name;currentRole=res.role;
google.script.run.withSuccessHandler(function(settings){
currentTerm=settings.term;currentYear=settings.year;currentSystemStatus=settings.status;
currentPeriod=settings.period;

sessionStorage.setItem('mmv_session',JSON.stringify({
id:currentTeacherId,name:currentTeacherName,role:currentRole,
term:currentTerm,year:currentYear,status:currentSystemStatus,period:currentPeriod
}));
document.getElementById("loginSection").classList.add("hidden");
const mainApp=document.getElementById("mainAppSection");
mainApp.classList.remove("hidden");mainApp.classList.add("flex");
document.getElementById("navTeacherName").innerText=formatTeacherName(currentTeacherName);
document.getElementById("navTermInfo").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;
document.getElementById("currentTermDisplay").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;

document.getElementById("settingTerm").value = currentTerm;
document.getElementById("settingYear").value = currentYear;
document.getElementById("settingPeriod").value = currentPeriod;

if(currentRole==="Admin"){
    document.getElementById("tabBtnReport").classList.remove("hidden");
    document.getElementById("tabBtnDatabase").classList.remove("hidden");
    document.getElementById("checkTerm").value = currentTerm;
    document.getElementById("checkYear").value = currentYear;
    loadTeacherNamesForDatalist(); 
    renderFormTable();
}
updateSystemStatusUI();loadSubjects();
if(currentRole==="Admin") loadReportFilters();
}).getSystemSettings();
}

function loadTeacherNamesForDatalist() {
    google.script.run.withSuccessHandler(function(names) {
        globalTeacherNames = names;
        let dl = document.getElementById("teacherDatalist");
        dl.innerHTML = "";
        names.forEach(n => {
            let opt = document.createElement("option");
            opt.value = n;
            dl.appendChild(opt);
        });
        
        let remSelect = document.getElementById("remedialTeacherSelect");
        if (remSelect) {
            remSelect.innerHTML = '<option value="ALL">-- ครูผู้สอนทุกคน (ทั้งหมด) --</option>';
            names.forEach(n => {
                let opt = document.createElement("option");
                opt.value = n;
                opt.text = formatTeacherName(n);
                remSelect.appendChild(opt);
            });
        }
    }).getTeacherNames();
}

function updateDatalistForInput(el) {
    if (!globalTeacherNames || globalTeacherNames.length === 0) return;
    
    let val = el.value;
    let lastCommaIndex = val.lastIndexOf(',');
    let prefix = "";
    
    if (lastCommaIndex !== -1) {
        prefix = val.substring(0, lastCommaIndex + 1).trim() + " ";
    }
    
    let dl = document.getElementById("teacherDatalist");
    dl.innerHTML = "";
    
    let currentSelected = prefix.split(',').map(s => s.trim());

    globalTeacherNames.forEach(n => {
        if(currentSelected.includes(n)) return; 
        
        let opt = document.createElement("option");
        opt.value = prefix + n;
        dl.appendChild(opt);
    });
}

function updateSystemStatusUI(){
const banner=document.getElementById("systemClosedBanner");
const saveBtn=document.getElementById("saveBtn");
const statusText=document.getElementById("statusText");
const toggleBtn=document.getElementById("toggleSystemBtn");
if(currentSystemStatus==="CLOSED"){
if(banner) banner.classList.remove("hidden");
if(saveBtn) saveBtn.disabled=true;
if(statusText){statusText.innerText="ปิดระบบ (CLOSED)";statusText.className="font-bold text-red-600";}
if(toggleBtn){toggleBtn.innerText="เปิดระบบรับกรอก";toggleBtn.className="bg-green-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-green-700 transition";}
}else{
if(banner) banner.classList.add("hidden");
if(saveBtn) saveBtn.disabled=false;
if(statusText){statusText.innerText="เปิดระบบ (OPEN)";statusText.className="font-bold text-green-600";}
if(toggleBtn){toggleBtn.innerText="ปิดระบบชั่วคราว";toggleBtn.className="bg-red-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-red-700 transition";}
}
}

function toggleSystemStatus(){
const newStatus=(currentSystemStatus==="OPEN")?"CLOSED":"OPEN";
google.script.run.withSuccessHandler(function(res){
if(res.success){
currentSystemStatus=res.status;
let session=JSON.parse(sessionStorage.getItem('mmv_session')||'{}');
session.status=currentSystemStatus;
sessionStorage.setItem('mmv_session',JSON.stringify(session));
updateSystemStatusUI();
showToast("สำเร็จ","เปลี่ยนสถานะระบบเป็น "+currentSystemStatus+" แล้ว");
}
}).setSystemStatus(newStatus);
}

function updateTermYear(e) {
    const t = document.getElementById('settingTerm').value.trim();
    const y = document.getElementById('settingYear').value.trim();
    const p = document.getElementById('settingPeriod').value;
    if(!t || !y) { alert("กรุณากรอกภาคเรียนและปีการศึกษาให้ครบถ้วน"); return; }
    
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    google.script.run.withSuccessHandler(function(res){
        btn.innerHTML = 'บันทึก';
        btn.disabled = false;
        if(res.success){
            currentTerm = res.term;
            currentYear = res.year;
            currentPeriod = res.period;
            
            document.getElementById("navTermInfo").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;
            document.getElementById("currentTermDisplay").innerText=`ภาคเรียนที่ ${currentTerm}/${currentYear} (${currentPeriod})`;
            
            let session=JSON.parse(sessionStorage.getItem('mmv_session')||'{}');
            session.term = currentTerm;
            session.year = currentYear;
            session.period = currentPeriod;
            sessionStorage.setItem('mmv_session',JSON.stringify(session));
            
            showToast("สำเร็จ", res.message);
            loadSubjects(); 
            loadReportFilters(); 
        }
    }).updateSystemTermYear(t, y, p);
}

function handleLogout(){
    document.getElementById('logoutModal').classList.remove('hidden');
}
function closeLogoutModal(){
    document.getElementById('logoutModal').classList.add('hidden');
}
function confirmLogout(){
    sessionStorage.removeItem('mmv_session');
    document.getElementById('logoutModal').classList.add('hidden');
    document.getElementById('mainAppSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('teacherId').value = '';
    document.getElementById('teacherPin').value = '';
}

function switchTab(tabName){
    ['viewGrading', 'viewReport', 'viewDatabase'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['tabBtnGrading', 'tabBtnReport', 'tabBtnDatabase'].forEach(id => {
        let el = document.getElementById(id);
        if(el) {
            el.classList.remove("bg-white", "text-blue-800", "shadow");
            el.classList.add("text-blue-100", "hover:text-white", "hover:bg-blue-700");
        }
    });

    if(tabName==='grading'){
        document.getElementById('viewGrading').classList.remove('hidden');
        let btn = document.getElementById('tabBtnGrading');
        btn.classList.add("bg-white", "text-blue-800", "shadow");
        btn.classList.remove("text-blue-100", "hover:text-white", "hover:bg-blue-700");
    } else if(tabName==='report'){
        document.getElementById('viewReport').classList.remove('hidden');
        let btn = document.getElementById('tabBtnReport');
        btn.classList.add("bg-white", "text-blue-800", "shadow");
        btn.classList.remove("text-blue-100", "hover:text-white", "hover:bg-blue-700");
        loadReportFilters();
    } else if(tabName==='database'){
        document.getElementById('viewDatabase').classList.remove('hidden');
        let btn = document.getElementById('tabBtnDatabase');
        if(btn){
            btn.classList.add("bg-white", "text-blue-800", "shadow");
            btn.classList.remove("text-blue-100", "hover:text-white", "hover:bg-blue-700");
        }
        loadTeacherAccountsList();
        loadExistingTeachingLoad();
    }
}

function loadSubjects(){
const select=document.getElementById("subjectSelect");
google.script.run.withSuccessHandler(function(subjects){
if(subjects.length>0){
select.innerHTML='<option value="">-- เลือกวิชาและห้องเรียน --</option>';
subjects.forEach(subj=>{
let option=document.createElement("option");
option.value=JSON.stringify(subj);
if(subj.subjectCode === "CLUB") {
    option.text=`${subj.subjectName} | ชุมนุม`;
} else {
    let clLevel = subj.classLevel ? subj.classLevel.toString().replace(/[ม\\.]/g, '').trim() : ''; 
    option.text=`${subj.subjectName} | ม.${clLevel}/${subj.room}`;
}
select.appendChild(option);
});
select.disabled=false;
}else{
select.innerHTML=`<option value="">ไม่พบภาระงานสอน ในภาคเรียน ${currentTerm}/${currentYear}</option>`;
select.disabled=true;
document.getElementById("gradingSection").classList.add("hidden");
}
}).getTeacherSubjects(currentTeacherName, currentTeacherId);
}

function updateActStyle(sel){
    sel.classList.remove('bg-red-50','text-red-600','font-bold','text-gray-400');
    if(sel.value === "ซ"){
        sel.classList.add('bg-red-50','text-red-600','font-bold');
    } else {
        sel.classList.add('text-gray-500'); 
    }
}

function updateStyle(sel){
    const tr=sel.closest('tr');
    if(sel.value!=="ปกติ"){sel.classList.add('bg-red-50','text-red-600','font-bold');tr.classList.add('bg-red-50/30');}
    else{sel.classList.remove('bg-red-50','text-red-600','font-bold');tr.classList.remove('bg-red-50/30');}
}

function loadStudents(){
const select=document.getElementById("subjectSelect");
if(select.value===""){
    document.getElementById("gradingSection").classList.add("hidden");
    return;
}

const indicator = document.getElementById("loadIndicator");
const subjData=JSON.parse(select.value);

indicator.classList.remove("hidden");
select.disabled = true;
document.getElementById("gradingSection").classList.add("hidden");

const thead = document.getElementById("tableHeader");
const subtitle = document.getElementById("tableSubtitle");
const mainTable = document.getElementById("mainTable");

if(subjData.subjectCode === "CLUB") {
    document.getElementById("tableTitle").innerText=`ชุมนุม: ${subjData.subjectName}`;
    subtitle.innerText = `ประเมินผลกิจกรรมชุมนุม (${currentPeriod}) (ค่าเริ่มต้นคือ -ปกติ- หากติด ซ ให้กดเปลี่ยน)`;
    mainTable.classList.remove("min-w-[1200px]");
    mainTable.classList.add("min-w-[600px]");
    thead.innerHTML = `
    <tr class="border-b border-blue-200 text-blue-800 text-sm bg-green-50">
        <th class="p-3 w-12 text-center sticky-col-1">ลำดับ</th>
        <th class="p-3 w-20 sticky-col-2">รหัส</th>
        <th class="p-3 min-w-[150px] sticky-col-3">ชื่อ - นามสกุล</th>
        <th class="p-3 w-16 text-center">ชั้น</th>
        <th class="p-3 w-16 text-center">ห้อง</th>
        <th class="p-3 text-center w-32">ผลประเมิน</th>
    </tr>`;
} else if(subjData.subjectCode === "ACT99") {
    let clLevel = subjData.classLevel.toString().replace(/[ม\\.]/g, '').trim();
    document.getElementById("tableTitle").innerText=`วิชา: ${subjData.subjectCode} ${subjData.subjectName} (ม.${clLevel}/${subjData.room})`;
    subtitle.innerText = `กรุณาประเมินผลกิจกรรมพัฒนาผู้เรียน (${currentPeriod}) (ค่าเริ่มต้นคือ -ปกติ- หากติด ซ ให้กดเปลี่ยน)`;
    mainTable.classList.remove("min-w-[1200px]");
    mainTable.classList.add("min-w-[800px]");
    thead.innerHTML = `
    <tr class="border-b border-blue-200 text-blue-800 text-sm bg-blue-100/50">
        <th class="p-3 w-12 text-center sticky-col-1">เลขที่</th>
        <th class="p-3 w-20 sticky-col-2">รหัส</th>
        <th class="p-3 min-w-[150px] sticky-col-3">ชื่อ - นามสกุล</th>
        <th class="p-3 text-center">แนะแนว</th>
        <th class="p-3 text-center">กิจกรรมเพื่อสังคมฯ</th>
        <th class="p-3 text-center">ชุมนุม</th>
        <th class="p-3 text-center">รักการอ่าน</th>
    </tr>`;
} else {
    let clLevel = subjData.classLevel.toString().replace(/[ม\\.]/g, '').trim();
    document.getElementById("tableTitle").innerText=`วิชา: ${subjData.subjectCode} ${subjData.subjectName} (ม.${clLevel}/${subjData.room})`;
    subtitle.innerText = `สามารถเลือกกรอกเฉพาะช่องที่ต้องการได้ (${currentPeriod})`;
    mainTable.classList.remove("min-w-[800px]");
    mainTable.classList.add("min-w-[1200px]");
    thead.innerHTML = `
    <tr class="border-b border-gray-200 text-gray-700 text-sm">
        <th class="p-3 w-12 text-center sticky-col-1">เลขที่</th>
        <th class="p-3 w-20 sticky-col-2">รหัส</th>
        <th class="p-3 min-w-[150px] sticky-col-3">ชื่อ - นามสกุล</th>
        <th class="p-2 text-center input-cell"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell bg-gray-100"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell bg-gray-100"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell bg-gray-100"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell bg-gray-100"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-2 text-center input-cell bg-gray-100"><input type="text" oninput="saveHeaders()" class="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-gray-700 font-bold" placeholder=""></th>
        <th class="p-3 w-28 text-center bg-blue-50/80">สถานะ</th>
    </tr>`;
}

let targetRoom = subjData.subjectCode === "CLUB" ? subjData.subjectName : subjData.room;

google.script.run.withSuccessHandler(function(res){
indicator.classList.add("hidden");
select.disabled = false;
const students = res.students;
const submission = res.submission;
currentLoadedSubmission = submission;
document.getElementById("studentCount").innerText=students.length;
const tbody=document.getElementById("studentTableBody");tbody.innerHTML="";

if(students.length===0){
    tbody.innerHTML=`<tr><td colspan="14" class="p-4 text-center text-red-500">ไม่พบรายชื่อนักเรียน${subjData.subjectCode === "CLUB" ? "ในชุมนุมนี้ (โปรดนำเข้าไฟล์รายชื่อนักเรียนชุมนุม)" : "ในห้องนี้"}</td></tr>`;
}else{
    students.forEach(student=>{
        if (subjData.subjectCode === "CLUB") {
            let makeSelect = (val) => `
                <select class="w-full border border-gray-300 rounded-md p-2 text-center outline-none focus:border-blue-500 transition-colors status-select ${val==='ซ'?'bg-red-50 text-red-600 font-bold':'text-gray-500'}" onchange="updateActStyle(this)">
                    <option value="" ${!val?'selected':''}>- ปกติ -</option>
                    <option value="ซ" class="text-red-600 font-bold" ${val==='ซ'?'selected':''}>ช</option>
                </select>
            `;
            tbody.innerHTML+=`
            <tr class="border-b border-gray-100 hover:bg-green-50/50">
                <td class="p-2 text-center text-gray-500 sticky-col-1">${student.no}</td>
                <td class="p-2 font-mono student-id text-xs sticky-col-2">${student.id}</td>
                <td class="p-2 font-medium student-name text-xs md:text-sm whitespace-nowrap sticky-col-3">${student.name}</td>
                <td class="p-2 text-center text-gray-500 text-xs">${student.level}</td>
                <td class="p-2 text-center text-gray-500 text-xs">${student.room}</td>
                <td class="p-2">${makeSelect(student.status)}</td>
                <td class="hidden">
                    <input type="hidden" class="score-1" value=""><input type="hidden" class="score-2" value=""><input type="hidden" class="score-3" value=""><input type="hidden" class="score-4" value=""><input type="hidden" class="score-5" value=""><input type="hidden" class="score-6" value=""><input type="hidden" class="score-7" value=""><input type="hidden" class="score-8" value=""><input type="hidden" class="score-9" value=""><input type="hidden" class="score-10" value="">
                </td>
            </tr>`;
        } else if(subjData.subjectCode === "ACT99") {
            let makeSelect = (val, cls) => `
                <select class="w-full border border-gray-300 rounded-md p-2 text-center outline-none focus:border-blue-500 transition-colors ${cls} ${val==='ซ'?'bg-red-50 text-red-600 font-bold':'text-gray-500'}" onchange="updateActStyle(this)">
                    <option value="" ${!val?'selected':''}>- ปกติ -</option>
                    <option value="ซ" class="text-red-600 font-bold" ${val==='ซ'?'selected':''}>ช</option>
                </select>
            `;
            
            let makeDisabledSelect = (val) => `
                <select class="w-full border border-gray-200 rounded-md p-2 text-center bg-gray-100 text-gray-500 cursor-not-allowed text-xs" disabled title="ประเมินโดยครูชุมนุม">
                    <option>${val === 'ซ' ? 'ช (ครูชุมนุม)' : (student.hasClubGrade ? 'ปกติ (ครูชุมนุม)' : 'รอครูชุมนุม')}</option>
                </select>
                <input type="hidden" class="score-3" value="${val || ''}">
            `;

            tbody.innerHTML+=`
            <tr class="border-b border-gray-100 hover:bg-blue-50/50">
                <td class="p-2 text-center text-gray-500 sticky-col-1">${student.no}</td>
                <td class="p-2 font-mono student-id text-xs sticky-col-2">${student.id}</td>
                <td class="p-2 font-medium student-name text-xs md:text-sm whitespace-nowrap sticky-col-3">${student.name}</td>
                <td class="p-2">${makeSelect(student.s1, 'score-1')}</td>
                <td class="p-2">${makeSelect(student.s2, 'score-2')}</td>
                <td class="p-2">${makeDisabledSelect(student.s3)}</td>
                <td class="p-2">${makeSelect(student.s4, 'score-4')}</td>
                <td class="hidden">
                    <input type="hidden" class="score-5" value="${student.s5||''}">
                    <input type="hidden" class="score-6" value="${student.s6||''}">
                    <input type="hidden" class="score-7" value="${student.s7||''}">
                    <input type="hidden" class="score-8" value="${student.s8||''}">
                    <input type="hidden" class="score-9" value="${student.s9||''}">
                    <input type="hidden" class="score-10" value="${student.s10||''}">
                    <input type="hidden" class="status-select" value="${student.status||'ปกติ'}">
                </td>
            </tr>`;
        } else {
            let statSelect=`<select class="w-full border rounded p-1 text-center status-select ${student.status!=='ปกติ'&&student.status?'bg-red-50 text-red-600 font-bold':''}" onchange="updateStyle(this)">
            <option value="ปกติ" ${student.status==='ปกติ'||!student.status?'selected':''}>ปกติ</option>
            <option value="ซ" class="text-red-500 font-bold" ${student.status==='ซ'?'selected':''}>ช</option>
            <option value="0" class="text-red-500 font-bold" ${student.status==='0'?'selected':''}>0</option>
            <option value="ร" class="text-orange-500 font-bold" ${student.status==='ร'?'selected':''}>ร</option>
            <option value="มส." class="text-red-500" ${student.status==='มส.'?'selected':''}>มส.</option>
            <option value="มผ." class="text-orange-500" ${student.status==='มผ.'?'selected':''}>มผ.</option>
            </select>`;
            tbody.innerHTML+=`
            <tr class="border-b border-gray-100 hover:bg-blue-50/50 ${student.status!=='ปกติ'&&student.status?'bg-red-50/30':''}">
            <td class="p-2 text-center text-gray-500 sticky-col-1">${student.no}</td>
            <td class="p-2 font-mono student-id text-xs sticky-col-2">${student.id}</td>
            <td class="p-2 font-medium student-name text-xs md:text-sm whitespace-nowrap sticky-col-3">${student.name}</td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-1" value="${student.s1!==undefined?student.s1:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-2" value="${student.s2!==undefined?student.s2:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-3" value="${student.s3!==undefined?student.s3:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-4" value="${student.s4!==undefined?student.s4:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-5" value="${student.s5!==undefined?student.s5:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-6 bg-gray-50" value="${student.s6!==undefined?student.s6:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-7 bg-gray-50" value="${student.s7!==undefined?student.s7:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-8 bg-gray-50" value="${student.s8!==undefined?student.s8:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-9 bg-gray-50" value="${student.s9!==undefined?student.s9:''}"></td>
            <td class="p-1"><input type="number" class="w-full border rounded p-1 text-center score-10 bg-gray-50" value="${student.s10!==undefined?student.s10:''}"></td>
            <td class="p-2 text-center bg-blue-50/50">${statSelect}</td>
            </tr>`;
        }
    });
}
document.getElementById("gradingSection").classList.remove("hidden");
updateUIForLockState(submission, subjData);
loadHeaders();
}).getStudentsByRoom(subjData.classLevel, targetRoom, currentTerm, currentYear, subjData.subjectCode, currentPeriod);
}

function saveData(){
if(currentSystemStatus==="CLOSED"){alert("ขออภัย! ผู้ดูแลระบบปิดการกรอกคะแนนชั่วคราวแล้ว");return;}
document.getElementById("saveBtn").classList.add("hidden");document.getElementById("saveStatus").classList.remove("hidden");
const subjData=JSON.parse(document.getElementById("subjectSelect").value);
let studentDataArr=[];
document.querySelectorAll('#studentTableBody tr').forEach(tr=>{
studentDataArr.push({
id:tr.querySelector('.student-id').innerText,name:tr.querySelector('.student-name').innerText,
s1:tr.querySelector('.score-1').value,s2:tr.querySelector('.score-2').value,
s3:tr.querySelector('.score-3').value,s4:tr.querySelector('.score-4').value,
s5:tr.querySelector('.score-5').value,s6:tr.querySelector('.score-6').value,
s7:tr.querySelector('.score-7').value,s8:tr.querySelector('.score-8').value,
s9:tr.querySelector('.score-9').value,s10:tr.querySelector('.score-10').value,
status:tr.querySelector('.status-select').value
});
});
google.script.run.withSuccessHandler(function(msg){
document.getElementById("saveStatus").classList.add("hidden");
document.getElementById("saveBtn").classList.remove("hidden");
let text = (typeof msg === 'object' && msg !== null && msg.message) ? msg.message : msg;
showToast("สำเร็จ", text || "บันทึกคะแนนเรียบร้อยแล้ว");
}).saveGradesToSheet({term:currentTerm,year:currentYear,period:currentPeriod,...subjData,students:studentDataArr});
}

function loadReportFilters(){
google.script.run.withSuccessHandler(function(filters){
globalReportFilters = filters;
const ts=document.getElementById('termSelect');
const ls=document.getElementById('levelSelect');
const rs=document.getElementById('roomSelect');
const tts=document.getElementById('trackTermSelect');

ts.innerHTML='';
ls.innerHTML='<option value="">-- เลือกระดับ --</option>';
rs.innerHTML='<option value="">-- เลือกห้อง --</option>';
tts.innerHTML='';

let curTY = currentTerm + "/" + currentYear;
if(filters.terms.length===0){
    ts.innerHTML='<option value="">ไม่มีข้อมูล</option>';
    tts.innerHTML=`<option value="${curTY}">เทอม ${curTY} (ปัจจุบัน)</option>`;
    return;
}

if(!filters.terms.includes(curTY)) filters.terms.unshift(curTY);
    
    let remTermSelect = document.getElementById("remedialTermSelect");
    if (remTermSelect) {
        remTermSelect.innerHTML = '';
        filters.terms.forEach(t => remTermSelect.appendChild(new Option(`เทอม ${t}`, t)));
        remTermSelect.value = curTY;
    }

    let approveTermSelect = document.getElementById("approveTermSelect");
    if (approveTermSelect) {
        approveTermSelect.innerHTML = '';
        filters.terms.forEach(t => approveTermSelect.appendChild(new Option(`เทอม ${t}`, t)));
        approveTermSelect.value = curTY;
    }

filters.terms.forEach(t=>{
    ts.appendChild(new Option(`เทอม ${t}`,t));
    tts.appendChild(new Option(`เทอม ${t}`,t));
});
ts.value = curTY;
tts.value = curTY;

filters.levels.forEach(l=>{
    ls.appendChild(new Option(l,l));
});
}).getReportFilters();
}

function updateRoomSelect() {
    const ls = document.getElementById('levelSelect').value;
    const rs = document.getElementById('roomSelect');
    rs.innerHTML = '<option value="">-- เลือกห้อง --</option>';
    if(ls && globalReportFilters && globalReportFilters.roomsByLevel[ls]) {
        rs.appendChild(new Option("รวมทุกห้องในระดับ", "all"));
        globalReportFilters.roomsByLevel[ls].forEach(r => {
            rs.appendChild(new Option(`ห้อง ${r}`, r));
        });
    }
}

function loadMatrixReport(){
const term=document.getElementById('termSelect').value;
const level=document.getElementById('levelSelect').value;
const room=document.getElementById('roomSelect').value;
const period=document.getElementById('reportPeriodSelect').value;

if(!term||!level||!room){alert("กรุณาเลือกข้อมูลให้ครบถ้วน");return;}
document.getElementById('reportContainer').classList.add('hidden');document.getElementById('pdfBtn').classList.add('hidden');
document.getElementById('reportErrorMsg').classList.add('hidden');document.getElementById('reportLoading').classList.remove('hidden');
google.script.run.withSuccessHandler(renderMatrixTable).getMatrixReport(period,term,level,room);
}

function renderMatrixTable(res){
    document.getElementById('reportLoading').classList.add('hidden');
    if(!res.success){
        const err=document.getElementById('reportErrorMsg');err.innerText=res.message;err.classList.remove('hidden');return;
    }
    
    const termDisplay=document.getElementById('termSelect').value;
    const levelDisplay=document.getElementById('levelSelect').value;
    const periodDisplay=document.getElementById('reportPeriodSelect').value;
    const cleanLevel = levelDisplay.replace(/[ม\\.]/g, '');

    let finalHtml = `<div id="matrixPrintArea" style="font-family: 'Sarabun', sans-serif; color: #000; background: #fff; width: 100%; margin: 0; box-sizing: border-box;">`;

    res.reports.forEach((report, rIndex) => {
        const {students, subjects, grades, activities, advisorName, room} = report;
        
        if(rIndex > 0) {
            finalHtml += `<div style="page-break-before: always; height: 0px; margin: 0; padding: 0;"></div>`;
        }

        finalHtml += `
            <div class="room-page" style="width: 100%; box-sizing: border-box; padding-top: 10px;">
                <div style="text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 8px; line-height: 1.3; page-break-after: avoid;">
                    ผลการตรวจสำเนาคะแนนเก็บ${periodDisplay}ของนักเรียนชั้นมัธยมศึกษาปีที่ ${cleanLevel}/${room}<br>
                    ภาคเรียนที่ ${termDisplay}
                </div>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px; text-align: center;">
                    <thead style="display: table-header-group;">
                        <tr>
                            <th rowspan="2" style="border: 1px solid #000; width: 30px; padding: 2px; font-weight: bold;">เลขที่</th>
                            <th rowspan="2" style="border: 1px solid #000; width: 50px; padding: 2px; font-weight: bold;">เลขประจำตัว</th>
                            <th rowspan="2" style="border: 1px solid #000; width: auto; text-align: left; padding: 2px 6px; font-weight: bold;">ชื่อ - สกุล</th>
        `;

        subjects.forEach(sub => {
            finalHtml += `
                            <th style="border: 1px solid #000; height: 110px; padding: 0; width: 30px; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 50%; left: 50%; width: 100px; height: 30px; transform: translate(-50%, -50%) rotate(-90deg); line-height: 30px; text-align: left; padding-left: 5px; box-sizing: border-box;">
                                    <span style="white-space: nowrap; font-size: 10px; font-weight: normal; display: inline-block; vertical-align: middle; line-height: normal;">${sub.name}</span>
                                </div>
                            </th>
            `;
        });
        
        finalHtml += `       <th colspan="4" style="border: 1px solid #000; padding: 2px; font-weight: bold; font-size: 10px;">กิจกรรมพัฒนาผู้เรียน</th>`;
        finalHtml += `   </tr><tr>`;
        
        subjects.forEach(sub => {
            finalHtml += `<th style="border: 1px solid #000; padding: 1px 0; font-size: 8px; font-weight: normal; width: 30px;">${sub.code}</th>`;
        });

        const actNames = ['แนะแนว', 'กิจกรรมเพื่อสังคม', 'ชุมนุม', 'รักการอ่าน'];
        actNames.forEach(act => {
            finalHtml += `   <th style="border: 1px solid #000; height: 90px; padding: 0; width: 25px; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 50%; left: 50%; width: 80px; height: 25px; transform: translate(-50%, -50%) rotate(-90deg); line-height: 25px; text-align: left; padding-left: 5px; box-sizing: border-box;">
                                    <span style="white-space: nowrap; font-size: 9px; font-weight: normal; display: inline-block; vertical-align: middle; line-height: normal;">${act}</span>
                                </div>
                            </th>`;
        });

        finalHtml += `   </tr></thead><tbody>`;

        let getActColor = (v) => (v==='ซ'||v==='มผ') ? 'red' : 'black';

        students.forEach((student, index) => {
            let displayNo = student.no !== 999 && student.no !== undefined ? student.no : (index + 1);

            finalHtml += `
                    <tr style="page-break-inside: avoid;">
                        <td style="border: 1px solid #000; padding: 1px 2px;">${displayNo}</td>
                        <td style="border: 1px solid #000; padding: 1px 2px;">${student.id}</td>
                        <td style="border: 1px solid #000; padding: 1px 6px; text-align: left; white-space: nowrap; overflow: hidden;">${student.name}</td>
            `;
            
            subjects.forEach(sub => {
                let status = grades[student.id + "_" + sub.code];
                let displayStatus = status ? `<span style="color: red; font-family: 'Sarabun'; font-weight: bold;">${status}</span>` : '';
                finalHtml += `<td style="border: 1px solid #000; padding: 1px 2px;">${displayStatus}</td>`;
            });

            let actData = activities ? activities[student.id] : null;
            let a1 = actData && actData.s1 ? `<span style="color: ${getActColor(actData.s1)}; font-family: 'Sarabun'; font-weight: bold;">${actData.s1}</span>` : '';
            let a2 = actData && actData.s2 ? `<span style="color: ${getActColor(actData.s2)}; font-family: 'Sarabun'; font-weight: bold;">${actData.s2}</span>` : '';
            let a3 = actData && actData.s3 ? `<span style="color: ${getActColor(actData.s3)}; font-family: 'Sarabun'; font-weight: bold;">${actData.s3}</span>` : '';
            let a4 = actData && actData.s4 ? `<span style="color: ${getActColor(actData.s4)}; font-family: 'Sarabun'; font-weight: bold;">${actData.s4}</span>` : '';

            finalHtml += `<td style="border: 1px solid #000; padding: 1px 2px;">${a1}</td>`;
            finalHtml += `<td style="border: 1px solid #000; padding: 1px 2px;">${a2}</td>`;
            finalHtml += `<td style="border: 1px solid #000; padding: 1px 2px;">${a3}</td>`;
            finalHtml += `<td style="border: 1px solid #000; padding: 1px 2px;">${a4}</td>`;
            finalHtml += `</tr>`;
        });

        
        // สรุปจำนวนนักเรียนที่ติด ซ ต่อรายวิชา
        finalHtml += `
                    <tr style="page-break-inside: avoid; background-color: #fef2f2;">
                        <td colspan="3" style="border: 1px solid #000; padding: 3px 8px; text-align: right; font-weight: bold; color: #b91c1c; font-size: 9px;">จำนวนนักเรียนติด ซ (คน)</td>
        `;
        subjects.forEach(sub => {
            let failCount = 0;
            students.forEach(st => {
                let s = grades[st.id + "_" + sub.code];
                if (s === 'ซ' || s === 'มส' || s === 'มผ') failCount++;
            });
            let displayCount = failCount > 0 ? `<span style="color: red; font-weight: bold; font-size: 9px;">${failCount}</span>` : '<span style="color: #64748b; font-size: 8px;">0</span>';
            finalHtml += `<td style="border: 1px solid #000; padding: 2px; text-align: center;">${displayCount}</td>`;
        });
        
        let actFailCount = [0, 0, 0, 0];
        students.forEach(st => {
            let act = activities ? activities[st.id] : null;
            if (act) {
                if (act.s1 === 'ซ' || act.s1 === 'มผ') actFailCount[0]++;
                if (act.s2 === 'ซ' || act.s2 === 'มผ') actFailCount[1]++;
                if (act.s3 === 'ซ' || act.s3 === 'มผ') actFailCount[2]++;
                if (act.s4 === 'ซ' || act.s4 === 'มผ') actFailCount[3]++;
            }
        });
        actFailCount.forEach(c => {
            let disp = c > 0 ? `<span style="color: red; font-weight: bold; font-size: 9px;">${c}</span>` : '<span style="color: #64748b; font-size: 8px;">0</span>';
            finalHtml += `<td style="border: 1px solid #000; padding: 2px; text-align: center;">${disp}</td>`;
        });
        finalHtml += `</tr>`;

        finalHtml += `
                    <tr style="page-break-inside: avoid;">
                        <td colspan="3" style="border: 1px solid #000; padding: 4px 10px; text-align: right; font-weight: bold;">ครูผู้สอนประจำวิชา</td>
        `;
        subjects.forEach(sub => {
            let displayTeacher = sub.teacher.replace(/,/g, '<br>');
            finalHtml += `
                        <td style="border: 1px solid #000; height: 80px; padding: 0; width: 30px; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: 50%; left: 50%; width: 75px; height: 30px; transform: translate(-50%, -50%) rotate(-90deg); text-align: left; padding-left: 5px; box-sizing: border-box;">
                                <span style="font-size: 8px; font-weight: normal; display: inline-block; vertical-align: middle; line-height: 1.1;">${displayTeacher}</span>
                            </div>
                        </td>
            `;
        });

        // ลบชื่อครูที่ปรึกษาออก ปล่อยเว้นว่างไว้ 4 ช่อง
        finalHtml += `<td colspan="4" style="border: 1px solid #000; height: 80px; padding: 0;"></td>`;

        finalHtml += `   </tr></tbody></table></div>`;
    }); 
    
    finalHtml += `</div>`; 

    const container = document.getElementById('reportContainer');
    container.innerHTML = finalHtml;
    container.classList.remove('hidden');
    document.getElementById('pdfBtn').classList.remove('hidden');
}

function exportPDF(){
const element=document.getElementById('matrixPrintArea');
const term=document.getElementById('termSelect').value.replace('/','-');
const level=document.getElementById('levelSelect').value.replace(/\\./g, '');
const roomStr=document.getElementById('roomSelect').value === 'all' ? 'รวม' : document.getElementById('roomSelect').value;
const period=document.getElementById('reportPeriodSelect').value;
const btn=document.getElementById('pdfBtn');const orig=btn.innerHTML;
btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> สร้าง PDF...';btn.disabled=true;

html2pdf().set({
margin: [0.3, 0.3, 0.3, 0.3], 
filename: `รายงานผล_${period}_เทอม_${term}_ชั้น${level}_ห้อง${roomStr}.pdf`,
image: {type: 'jpeg', quality: 1.0},
pagebreak: { mode: 'css', avoid: ['tr', 'thead'] }, 
html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowY: 0 },
jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
}).from(element).save().then(()=>{btn.innerHTML=orig;btn.disabled=false;});
}

function updateUploadInstructions() {
    const type = document.querySelector('input[name="fileUploadType"]:checked').value;
    const instr = document.getElementById('excelInstructions');
    if (type === 'teachers') {
        instr.innerText = "คอลัมน์ A-D: Username (รหัสประจำตัว) | ชื่อ-นามสกุลครู | ห้องที่ปรึกษา (เช่น ม.1/1) | สิทธิ์ (Teacher/Admin) *รหัสผ่านเริ่มต้นคือ Password@123";
    } else if (type === 'students') {
        instr.innerText = "คอลัมน์ A-E: เลขที่ | รหัสประจำตัวนักเรียน | ชื่อ-นามสกุล | ระดับชั้น (เช่น ม.1) | ห้อง (เช่น 1)";
    } else if (type === 'teachingLoad') {
        instr.innerText = "คอลัมน์ A-G: ชื่อครู | รหัสวิชา | ชื่อรายวิชา | ระดับชั้น | ห้อง | ภาคเรียน | ปีการศึกษา";
    } else if (type === 'clubStudents') {
        instr.innerText = "คอลัมน์ A-E: ชื่อชุมนุม | รหัสนักเรียน | ชื่อ-สกุล | ชั้น | ห้อง";
    } else if (type === 'isStudents') {
        instr.innerText = "คอลัมน์ A-D: ชื่อครูผู้สอน | ระดับชั้น (ม.2 หรือ ม.4) | รหัสวิชา (I 20201 หรือ I 30201) | รหัสนักเรียน (5 หลัก)";
    }
}

function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        selectedExcelFile = null;
        document.getElementById('excelFileNameDisplay').innerText = "คลิกหรือลากไฟล์ Excel มาวางที่นี่";
        document.getElementById('btnUploadExcel').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('btnUploadExcel').disabled = true;
        return;
    }
    selectedExcelFile = file;
    document.getElementById('excelFileNameDisplay').innerHTML = `<span class="text-blue-600 font-bold">${file.name}</span>`;
    document.getElementById('btnUploadExcel').classList.remove('opacity-50', 'cursor-not-allowed');
    document.getElementById('btnUploadExcel').disabled = false;
}

function processExcelUpload() {
    if (!selectedExcelFile) return;
    
    const type = document.querySelector('input[name="fileUploadType"]:checked').value;
    const btn = document.getElementById('btnUploadExcel');
    const statusDiv = document.getElementById('excelUploadStatus');
    const overwrite = document.getElementById('overwriteExcelCheck').checked;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังประมวลผล...';
    btn.disabled = true;
    statusDiv.classList.add('hidden');
    statusDiv.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            let processedData = [];
            
            for(let i = 0; i < json.length; i++) {
                let row = json[i];
                if(row.length === 0) continue;
                
                if (type === 'isStudents') {
                    if(i === 0 && (row[0].toString().includes("ครู") || row[0].toString().includes("ชื่อ"))) continue;
                    if(row.length >= 3 && row[0]) {
                        let tName = row[0] ? row[0].toString().trim() : "";
                        let cLvl = row[1] ? row[1].toString().trim() : "ม.2";
                        let sCode = (row.length >= 4 && row[2]) ? row[2].toString().trim() : (cLvl.includes("4") ? "I 30201" : "I 20201");
                        let sId = (row.length >= 4 && row[3]) ? row[3].toString().trim() : (row[2] ? row[2].toString().trim() : "");
                        
                        if (tName && sId) {
                            processedData.push([tName, cLvl, sCode, sId, currentTerm, currentYear]);
                        }
                    }
                } else if (type === 'teachers') {
                    if(i === 0 && (row[0].toString().toLowerCase().includes("user") || row[0].toString().includes("รหัส") || row[0].toString().includes("ชื่อ"))) continue;
                    if(row.length >= 2 && row[0]) {
                        let uName = row[0] ? row[0].toString().trim() : "";
                        let pass = "Password@123";
                        let name = "";
                        let advisor = "";
                        let role = "Teacher";

                        if (row.length >= 4 && (row[1].toString().toLowerCase().includes("teacher") || row[1].toString().length > 10 || isNaN(row[1]))) {
                            name = row[1] ? row[1].toString().trim() : "";
                            advisor = row[2] ? row[2].toString().trim() : "";
                            role = row[3] ? (row[3].toString().trim().toLowerCase() === "admin" ? "Admin" : "Teacher") : "Teacher";
                        } else if (row.length >= 3) {
                            if (row[2]) {
                                pass = row[1] ? row[1].toString().trim() : "Password@123";
                                name = row[2] ? row[2].toString().trim() : "";
                                advisor = row[3] ? row[3].toString().trim() : "";
                                role = row[4] ? (row[4].toString().trim().toLowerCase() === "admin" ? "Admin" : "Teacher") : "Teacher";
                            } else {
                                name = row[1] ? row[1].toString().trim() : "";
                            }
                        } else {
                            name = row[1] ? row[1].toString().trim() : "";
                        }

                        if (uName && name) {
                            processedData.push([uName, pass, name, advisor, role]);
                        }
                    }
                } else if (type === 'students') {
                    if(i === 0 && (row[1] && row[1].toString().includes("รหัส") || row[2] && row[2].toString().includes("ชื่อ"))) continue;
                    if(row.length >= 3) {
                        let sNo = row[0] ? parseInt(row[0].toString().trim()) || null : null;
                        let sId = row[1] ? row[1].toString().trim() : "";
                        let sName = row[2] ? row[2].toString().trim() : "";
                        let sLvl = row[3] ? row[3].toString().trim() : "";
                        let sRoom = row[4] ? row[4].toString().trim() : "";
                        if (sId && sName) processedData.push([sNo, sId, sName, sLvl, sRoom]);
                    }
                } else if (type === 'clubStudents') {
                    if(i === 0 && row[0] && row[0].toString().includes("ชื่อชุมนุม")) continue;
                    if(row.length >= 3 && row[0] && row[1]) {
                        let cName = row[0] ? row[0].toString().trim() : "";
                        let sId = row[1] ? row[1].toString().trim() : "";
                        let sName = row[2] ? row[2].toString().trim() : "";
                        let sLvl = row[3] ? row[3].toString().trim() : "";
                        let sRoom = row[4] ? row[4].toString().trim() : "";
                        processedData.push([cName, sId, sName, sLvl, sRoom]);
                    }
                } else if (type === 'teachingLoad') {
                    if(i === 0 && row[0] && row[0].toString().includes("ชื่อครู")) continue;
                    if(row.length >= 5 && row[0] && row[1]) {
                        let tName = row[0] ? row[0].toString().trim() : "";
                        let sCode = row[1] ? row[1].toString().trim() : "";
                        let sName = row[2] ? row[2].toString().trim() : "";
                        let sLvl = row[3] ? row[3].toString().trim() : "";
                        let sRooms = row[4] ? row[4].toString().trim() : "";
                        let sTerm = row[5] ? row[5].toString().trim() : currentTerm;
                        let sYear = row[6] ? row[6].toString().trim() : currentYear;
                        
                        let parts = sRooms.split(',');
                        let expandedRooms = [];
                        parts.forEach(p => {
                            let range = p.split('-');
                            if (range.length === 2) {
                                let start = parseInt(range[0].trim());
                                let end = parseInt(range[1].trim());
                                if (!isNaN(start) && !isNaN(end) && start <= end) {
                                    for (let r = start; r <= end; r++) expandedRooms.push(r.toString());
                                } else { expandedRooms.push(p.trim()); }
                            } else { expandedRooms.push(p.trim()); }
                        });
                        expandedRooms = [...new Set(expandedRooms)].filter(r => r !== "");
                        
                        expandedRooms.forEach(r => {
                            processedData.push([tName, sCode, sName, sLvl, r, sTerm, sYear]);
                        });
                    }
                }
            }
            
            if(processedData.length === 0) {
                showExcelUploadStatus("ไม่พบข้อมูล หรือรูปแบบคอลัมน์ไม่ถูกต้อง กรุณาตรวจสอบไฟล์อีกครั้ง", false);
                btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> กำลังบันทึกลงระบบ...';
            
            if (type === 'isStudents') {
                google.script.run.withSuccessHandler(function(msg) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    showExcelUploadStatus(msg, true);
                    resetExcelFileInput();
                }).withFailureHandler(function(err) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    btn.disabled = false;
                    showExcelUploadStatus("เกิดข้อผิดพลาด: " + err.message, false);
                }).saveDatabaseWeb('isStudents', processedData, overwrite);
            } else if (type === 'clubStudents') {
                google.script.run.withSuccessHandler(function(msg) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    showExcelUploadStatus(msg, true);
                    resetExcelFileInput();
                }).withFailureHandler(function(err) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    btn.disabled = false;
                    showExcelUploadStatus("เกิดข้อผิดพลาด: " + err.message, false);
                }).uploadClubStudents(processedData, overwrite);
            } else if (type === 'students') {
                google.script.run.withSuccessHandler(function(msg) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    showExcelUploadStatus(msg, true);
                    resetExcelFileInput();
                }).withFailureHandler(function(err) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    btn.disabled = false;
                    showExcelUploadStatus("เกิดข้อผิดพลาด: " + err.message, false);
                }).uploadStudents(processedData, overwrite);
            } else if (type === 'teachers') {
                google.script.run.withSuccessHandler(function(msg) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    showExcelUploadStatus(msg, true);
                    resetExcelFileInput();
                    loadTeacherNamesForDatalist();
                }).withFailureHandler(function(err) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    btn.disabled = false;
                    showExcelUploadStatus("เกิดข้อผิดพลาด: " + err.message, false);
                }).saveDatabaseWeb('teachers', processedData, overwrite);
            } else {
                google.script.run.withSuccessHandler(function(msg) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    showExcelUploadStatus(msg, true);
                    resetExcelFileInput();
                    loadExistingTeachingLoad(); 
                }).withFailureHandler(function(err) {
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
                    btn.disabled = false;
                    showExcelUploadStatus("เกิดข้อผิดพลาด: " + err.message, false);
                }).saveDatabaseWeb('teachingLoad', processedData, overwrite);
            }
            
        } catch (err) {
            showExcelUploadStatus("ไม่สามารถอ่านไฟล์ได้ โปรดตรวจสอบว่าเป็นไฟล์ Excel ที่ถูกต้อง", false);
            btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> เริ่มอัปโหลด';
            btn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(selectedExcelFile);
}

function resetExcelFileInput() {
    document.getElementById('excelFileUpload').value = ""; 
    selectedExcelFile = null;
    document.getElementById('excelFileNameDisplay').innerText = "คลิกหรือลากไฟล์ Excel มาวางที่นี่";
    document.getElementById('btnUploadExcel').classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('btnUploadExcel').disabled = true;
}

function showExcelUploadStatus(msg, isSuccess) {
    const statusDiv = document.getElementById('excelUploadStatus');
    let text = (typeof msg === 'object' && msg !== null && msg.message) ? msg.message : msg;
    statusDiv.innerText = text;
    statusDiv.classList.remove('hidden');
    if (isSuccess) {
        statusDiv.classList.add('bg-green-100', 'text-green-700');
        showToast("สำเร็จ", text || "นำเข้าข้อมูลเรียบร้อยแล้ว");
    } else {
        statusDiv.classList.add('bg-red-100', 'text-red-700');
    }
}

function loadMissingGrades() {
    const termVal = document.getElementById('trackTermSelect').value;
    const periodVal = document.getElementById('trackPeriodSelect').value;
    if(!termVal) { alert("กรุณาเลือกภาคเรียน"); return; }
    let parts = termVal.split('/');
    let term = parts[0];
    let year = parts[1];

    document.getElementById('trackResult').classList.add('hidden');
    document.getElementById('trackLoading').classList.remove('hidden');

    google.script.run.withSuccessHandler(function(res) {
        document.getElementById('trackLoading').classList.add('hidden');
        const container = document.getElementById('trackResult');
        container.innerHTML = '';
        
        if (res.data.length === 0) {
            container.innerHTML = `<div class="bg-green-50 text-green-700 p-4 rounded-lg text-center font-bold border border-green-200"><i class="fa-solid fa-circle-check text-xl mb-2 block"></i> ยอดเยี่ยม! ครูทุกคนส่งคะแนน (${periodVal}) ครบถ้วนแล้วครับ</div>`;
        } else {
            let html = `<div class="mb-3 text-red-600 font-bold text-sm"><i class="fa-solid fa-circle-exclamation"></i> พบรายวิชาที่ยังไม่ส่งคะแนนรวม ${res.totalMissing} รายการ จากครู ${res.data.length} ท่าน</div>`;
            html += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">`;
            
            res.data.forEach(t => {
                let tName = formatTeacherName(t.teacherName);
                
                let subjGroup = {};
                t.subjects.forEach(s => {
                    let key = s.subjectCode + "_" + s.classLevel;
                    if(!subjGroup[key]) {
                        subjGroup[key] = { ...s, rooms: [s.room] };
                    } else {
                        subjGroup[key].rooms.push(s.room);
                    }
                });
                
                let groupedSubjects = Object.values(subjGroup);
                
                html += `<div class="border border-red-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
                    <div class="bg-red-50 px-2 py-1.5 border-b border-red-100 font-bold text-red-800 flex justify-between items-center text-sm">
                        <span class="truncate pr-2" title="${tName}"><i class="fa-solid fa-chalkboard-user mr-1"></i> ${tName}</span>
                        <span class="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">${groupedSubjects.length} รายการ</span>
                    </div>
                    <div class="p-2 bg-white flex-grow">
                        <ul class="space-y-1.5">`;
                groupedSubjects.forEach(s => {
                    let cleanLvl = s.classLevel.toString().replace(/[ม\\.]/g, '').trim(); 
                    let formattedRooms = formatRooms(s.rooms);
                    html += `<li class="text-xs text-gray-700 flex justify-between items-start border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                        <div class="truncate pr-2">
                            <span class="font-bold text-blue-700 block">${s.subjectCode}</span> 
                            <span class="text-gray-500 hidden sm:inline">${s.subjectName}</span>
                        </div>
                        <span class="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-medium mt-0.5">ม.${cleanLvl} ห้อง ${formattedRooms}</span>
                    </li>`;
                });
                html += `</ul></div></div>`;
            });
            html += `</div>`;
            container.innerHTML = html;
        }
        container.classList.remove('hidden');
    }).getMissingGradesReport(periodVal, term, year);
}

let rawTeachingLoadData = [];
let selectedTeachingLoadLevel = 'ALL';

function selectTeachingLoadLevel(lvl) {
    selectedTeachingLoadLevel = lvl;
    
    const btnIds = {
        'ALL': 'lvlBtn_ALL',
        'ม.1': 'lvlBtn_M1',
        'ม.2': 'lvlBtn_M2',
        'ม.3': 'lvlBtn_M3',
        'ม.4': 'lvlBtn_M4',
        'ม.5': 'lvlBtn_M5',
        'ม.6': 'lvlBtn_M6'
    };

    Object.keys(btnIds).forEach(k => {
        const btn = document.getElementById(btnIds[k]);
        if (!btn) return;
        if (k === lvl) {
            btn.className = "lvl-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md bg-blue-600 text-white border border-blue-600 transform scale-105";
            const badge = btn.querySelector('span');
            if (badge) badge.className = "ml-1 bg-white/25 text-white px-2 py-0.5 rounded-full text-[10px]";
        } else {
            btn.className = "lvl-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm bg-white text-gray-700 hover:bg-blue-50 border border-gray-200";
            const badge = btn.querySelector('span');
            if (badge) badge.className = "ml-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px]";
        }
    });

    const badgeEl = document.getElementById('currentLevelBadge');
    if (badgeEl) {
        badgeEl.innerText = lvl === 'ALL' ? 'ทุกระดับชั้น (ม.1 - ม.6)' : 'ระดับชั้น ' + lvl;
    }

    renderGroupedTeachingLoad();
}

function loadExistingTeachingLoad() {
    const t = document.getElementById('checkTerm').value.trim();
    const y = document.getElementById('checkYear').value.trim();
    const tbody = document.getElementById('existingLoadBody');
    const sumDiv = document.getElementById('teachingLoadSummary');
    
    if(!t || !y) { alert("กรุณาระบุเทอมและปีการศึกษา"); return; }
    
    if (sumDiv) sumDiv.classList.add('hidden');
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-blue-600"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm font-bold">กำลังโหลดภาระงานสอน...</p></td></tr>';
    
    google.script.run.withSuccessHandler(function(data) {
        rawTeachingLoadData = Array.isArray(data) ? data : [];
        updateLevelCounts();
        renderGroupedTeachingLoad();
    }).withFailureHandler(function(err) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-500 font-bold">เกิดข้อผิดพลาด: ' + err.message + '</td></tr>';
    }).getExistingTeachingLoad(t, y);
}

function updateLevelCounts() {
    const counts = { 'ALL': 0, 'ม.1': 0, 'ม.2': 0, 'ม.3': 0, 'ม.4': 0, 'ม.5': 0, 'ม.6': 0 };
    
    let grouped = {};
    rawTeachingLoadData.forEach(row => {
        let cleanLvl = (row.level || '').toString().trim();
        let key = row.teacher + "___" + row.code + "___" + row.name + "___" + cleanLvl;
        if (!grouped[key]) {
            grouped[key] = { level: cleanLvl };
            counts['ALL']++;
            if (counts[cleanLvl] !== undefined) counts[cleanLvl]++;
        }
    });

    const elMap = {
        'ALL': 'count_ALL',
        'ม.1': 'count_M1',
        'ม.2': 'count_M2',
        'ม.3': 'count_M3',
        'ม.4': 'count_M4',
        'ม.5': 'count_M5',
        'ม.6': 'count_M6'
    };

    Object.keys(elMap).forEach(lvl => {
        const el = document.getElementById(elMap[lvl]);
        if (el) {
            el.innerText = counts[lvl] + ' วิชา';
        }
    });
}

function renderGroupedTeachingLoad() {
    const tbody = document.getElementById('existingLoadBody');
    const searchQuery = document.getElementById('searchTeachingLoad') ? document.getElementById('searchTeachingLoad').value.trim().toLowerCase() : '';
    const sumDiv = document.getElementById('teachingLoadSummary');
    const statsText = document.getElementById('teachingLoadStatsText');

    tbody.innerHTML = '';
    if (!rawTeachingLoadData || rawTeachingLoadData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500 font-bold">ไม่พบข้อมูลภาระงานสอนในภาคเรียนที่เลือก</td></tr>';
        if (sumDiv) sumDiv.classList.add('hidden');
        return;
    }

    // Filter by Selected Level and Search
    let filtered = rawTeachingLoadData.filter(row => {
        let matchLvl = (selectedTeachingLoadLevel === 'ALL') || (row.level && row.level.toString().trim() === selectedTeachingLoadLevel);
        let matchSearch = true;
        if (searchQuery) {
            let tStr = (row.teacher || '').toLowerCase();
            let cStr = (row.code || '').toLowerCase();
            let nStr = (row.name || '').toLowerCase();
            matchSearch = tStr.includes(searchQuery) || cStr.includes(searchQuery) || nStr.includes(searchQuery);
        }
        return matchLvl && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-amber-600 font-bold"><i class="fa-solid fa-circle-info mr-1"></i> ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา (' + (selectedTeachingLoadLevel === 'ALL' ? 'ทุกระดับชั้น' : selectedTeachingLoadLevel) + ')</td></tr>';
        if (sumDiv) sumDiv.classList.add('hidden');
        return;
    }

    // Group by Teacher + Code + Name + Level (Combine Rooms!)
    let grouped = {};
    filtered.forEach(row => {
        let cleanLvl = (row.level || '').toString().trim();
        let key = row.teacher + "___" + row.code + "___" + row.name + "___" + cleanLvl;
        if (!grouped[key]) {
            grouped[key] = {
                teacher: row.teacher,
                code: row.code,
                name: row.name,
                level: cleanLvl,
                rooms: [row.room]
            };
        } else {
            if (!grouped[key].rooms.includes(row.room)) {
                grouped[key].rooms.push(row.room);
            }
        }
    });

    const groupedRows = Object.values(grouped);

    // Sort by Level, Subject Code, Teacher Name
    const levelOrder = { 'ม.1': 1, 'ม.2': 2, 'ม.3': 3, 'ม.4': 4, 'ม.5': 5, 'ม.6': 6 };
    groupedRows.sort((a, b) => {
        let orderA = levelOrder[a.level] || 99;
        let orderB = levelOrder[b.level] || 99;
        if (orderA !== orderB) return orderA - orderB;
        if (a.code !== b.code) return a.code.localeCompare(b.code, 'th');
        return a.teacher.localeCompare(b.teacher, 'th');
    });

    if (sumDiv && statsText) {
        sumDiv.classList.remove('hidden');
        const lvlName = selectedTeachingLoadLevel === 'ALL' ? 'ทุกระดับชั้น (ม.1 - ม.6)' : 'ระดับชั้น ' + selectedTeachingLoadLevel;
        statsText.innerHTML = `<i class="fa-solid fa-list-check mr-1.5 text-blue-600"></i> แสดงภาระงานสอน ${lvlName}: ${groupedRows.length} รายการวิชา (รวม ${filtered.length} คาบ/ห้องเรียน)`;
    }

    // Render rows
    let currentLvl = "";
    let html = "";

    groupedRows.forEach(row => {
        if (selectedTeachingLoadLevel === 'ALL' && row.level !== currentLvl) {
            currentLvl = row.level;
            html += `
                <tr class="bg-gradient-to-r from-blue-100 via-indigo-50 to-white text-blue-900 font-bold border-t-2 border-b border-blue-200">
                    <td colspan="5" class="py-2.5 px-4 text-sm tracking-wide">
                        <i class="fa-solid fa-graduation-cap mr-1 text-blue-600"></i> ระดับชั้น ${currentLvl}
                    </td>
                </tr>
            `;
        }

        let formattedRooms = formatRooms(row.rooms);
        let tName = formatTeacherName(row.teacher);
        let cleanLvlDisplay = row.level.replace(/[ม\.]/g, '').trim();

        html += `
            <tr class="hover:bg-blue-50/70 border-b border-gray-100 transition-colors">
                <td class="p-3 border-r font-bold text-blue-900 flex items-center gap-2">
                    <div class="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                        <i class="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <span>${tName}</span>
                </td>
                <td class="p-3 border-r font-mono text-xs font-bold text-indigo-700">${row.code}</td>
                <td class="p-3 border-r text-gray-800 font-medium">${row.name}</td>
                <td class="p-3 border-r text-center font-bold text-gray-700">
                    <span class="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100">ม.${cleanLvlDisplay}</span>
                </td>
                <td class="p-3 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                        <i class="fa-solid fa-door-open mr-1 text-[10px]"></i> ห้อง ${formattedRooms}
                    </span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}


let rawTeacherAccounts = [];

function loadTeacherAccountsList() {
    const tbody = document.getElementById('teacherAccountsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-blue-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูลบัญชีผู้ใช้...</td></tr>';
    
    google.script.run.withSuccessHandler(function(data) {
        rawTeacherAccounts = Array.isArray(data) ? data : [];
        renderTeacherAccountsList();
    }).withFailureHandler(function(err) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-500 font-bold">เกิดข้อผิดพลาด: ' + err.message + '</td></tr>';
    }).getTeacherAccounts();
}

function renderTeacherAccountsList() {
    const tbody = document.getElementById('teacherAccountsBody');
    const search = document.getElementById('searchTeacherAccount') ? document.getElementById('searchTeacherAccount').value.trim().toLowerCase() : '';
    const statsEl = document.getElementById('teacherAccountStatsText');
    if (!tbody) return;

    if (!rawTeacherAccounts || rawTeacherAccounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500 font-medium">ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ</td></tr>';
        if (statsEl) statsEl.innerText = 'พบครูในระบบทั้งหมด 0 คน';
        return;
    }

    let filtered = rawTeacherAccounts.filter(acc => {
        if (!search) return true;
        let uStr = (acc.username || '').toLowerCase();
        let nStr = (acc.name || '').toLowerCase();
        let rStr = (acc.role || '').toLowerCase();
        return uStr.includes(search) || nStr.includes(search) || rStr.includes(search);
    });

    if (statsEl) {
        statsEl.innerText = `พบบัญชีผู้ใช้ ${filtered.length} จาก ${rawTeacherAccounts.length} บัญชี`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-amber-600 font-bold"><i class="fa-solid fa-circle-info mr-1"></i> ไม่พบบัญชีที่ตรงกับคำค้นหา</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(acc => {
        let isDef = (acc.isDefaultPassword == 1 || acc.isDefaultPassword === true || acc.isDefaultPassword === "1");
        let statusBadge = isDef ? 
            '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> รหัสเริ่มต้น (Password@123)</span>' :
            '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check text-[10px]"></i> เปลี่ยนรหัสผ่านแล้ว</span>';

        let roleBadge = acc.role === 'Admin' ? 
            '<span class="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md text-xs font-bold border border-purple-200"><i class="fa-solid fa-shield-halved mr-1"></i> Admin</span>' :
            '<span class="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-xs font-medium border border-blue-100">Teacher</span>';

        let advRoom = acc.advisorRoom ? `<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100">${acc.advisorRoom}</span>` : '<span class="text-gray-400 text-xs">-</span>';

        html += `
            <tr class="hover:bg-blue-50/50 border-b border-gray-100 transition-colors">
                <td class="p-3 font-mono font-bold text-gray-800 text-xs border-r border-gray-100">${acc.username}</td>
                <td class="p-3 font-bold text-blue-900 border-r border-gray-100 flex items-center gap-2">
                    <div class="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                        <i class="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <span>${formatTeacherName(acc.name)}</span>
                </td>
                <td class="p-3 text-center border-r border-gray-100">${advRoom}</td>
                <td class="p-3 text-center border-r border-gray-100">${roleBadge}</td>
                <td class="p-3 text-center border-r border-gray-100">${statusBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="confirmResetPassword('${acc.username}', '${acc.name.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto">
                        <i class="fa-solid fa-key"></i> รีเซ็ตรหัส
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function confirmResetPassword(username, teacherName) {
    if (!confirm(`ยืนยันการรีเซ็ตรหัสผ่านของคุณครู "${teacherName}" (Username: ${username})\n\nรหัสผ่านจะถูกตั้งกลับเป็น: Password@123\nและระบบจะบังคับให้ครูเปลี่ยนรหัสผ่านใหม่เมื่อเข้าใช้งานครั้งถัดไป`)) {
        return;
    }

    google.script.run.withSuccessHandler(function(res) {
        if (res.success) {
            showToast("รีเซ็ตสำเร็จ", res.message || "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว");
            loadTeacherAccountsList();
        } else {
            alert(res.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
        }
    }).withFailureHandler(function(err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }).resetTeacherPassword(username);
}

function renderFormTable() {
    const type = document.querySelector('input[name="uploadType"]:checked').value;
    const thead = document.getElementById('dbFormHead');
    const tbody = document.getElementById('dbFormBody');
    tbody.innerHTML = ''; 

    if (type === 'teachingLoad') {
        thead.innerHTML = `<tr>
            <th class="p-2 border border-gray-200">ชื่อครู <span class="text-xs text-blue-500 font-normal">(พิมพ์ค้นหาได้)</span></th>
            <th class="p-2 border border-gray-200 w-28">รหัสวิชา</th>
            <th class="p-2 border border-gray-200">ชื่อรายวิชา</th>
            <th class="p-2 border border-gray-200 w-24">ระดับชั้น</th>
            <th class="p-2 border border-gray-200 w-32 text-blue-600">ห้อง (เช่น 1-5)</th>
            <th class="p-2 border border-gray-200 w-20">เทอม</th>
            <th class="p-2 border border-gray-200 w-24">ปีการศึกษา</th>
            <th class="p-2 border border-gray-200 w-12 text-center"><i class="fa-solid fa-trash"></i></th>
        </tr>`;
    } else if (type === 'teachers') {
        thead.innerHTML = `<tr>
            <th class="p-2 border border-gray-200 w-48">Username (รหัสประจำตัว)</th>
            <th class="p-2 border border-gray-200">ชื่อ-นามสกุลครู</th>
            <th class="p-2 border border-gray-200 w-36 text-blue-600">ห้องที่ปรึกษา</th>
            <th class="p-2 border border-gray-200 w-28">สิทธิ์</th>
            <th class="p-2 border border-gray-200 w-12 text-center"><i class="fa-solid fa-trash"></i></th>
        </tr>`;
    } else if (type === 'clubTeachers') {
        thead.innerHTML = `<tr>
            <th class="p-2 border border-gray-200">ชื่อครูประจำชุมนุม <span class="text-xs text-blue-500 font-normal">(พิมพ์ค้นหาได้)</span></th>
            <th class="p-2 border border-gray-200">ชื่อชุมนุม <span class="text-xs text-red-500 font-normal">(ต้องตรงกับไฟล์ Excel)</span></th>
            <th class="p-2 border border-gray-200 w-20">เทอม</th>
            <th class="p-2 border border-gray-200 w-24">ปีการศึกษา</th>
            <th class="p-2 border border-gray-200 w-12 text-center"><i class="fa-solid fa-trash"></i></th>
        </tr>`;
    }
    addFormRow(); 
}

function addFormRow() {
    const type = document.querySelector('input[name="uploadType"]:checked').value;
    const tbody = document.getElementById('dbFormBody');
    const tr = document.createElement('tr');

    if (type === 'teachingLoad') {
        tr.innerHTML = `
            <td class="p-1 border border-gray-200">
                <input type="text" list="teacherDatalist" oninput="updateDatalistForInput(this)" onfocus="updateDatalistForInput(this)" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-blue-50/30" placeholder="พิมพ์ชื่อเพื่อค้นหา/เลือก...">
            </td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm" placeholder="ว22202"></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm" placeholder="คอมพิวเตอร์"></td>
            <td class="p-1 border border-gray-200">
                <select class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center">
                    <option value="ม.1">ม.1</option>
                    <option value="ม.2">ม.2</option>
                    <option value="ม.3">ม.3</option>
                    <option value="ม.4">ม.4</option>
                    <option value="ม.5">ม.5</option>
                    <option value="ม.6">ม.6</option>
                </select>
            </td>
            <td class="p-1 border border-gray-200 bg-blue-50"><input type="text" class="w-full border-blue-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center bg-transparent" placeholder="1-5"></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center" value="${currentTerm}"></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center" value="${currentYear}"></td>
            <td class="p-1 border border-gray-200 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded"><i class="fa-solid fa-trash"></i></button></td>
        `;
    } else if (type === 'teachers') {
        tr.innerHTML = `
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm" placeholder="เช่น 3210300..."></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm" placeholder="ชื่อ-นามสกุลครู"></td>
            <td class="p-1 border border-gray-200 bg-blue-50"><input type="text" class="w-full border-blue-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center bg-transparent" placeholder="ม.1/1"></td>
            <td class="p-1 border border-gray-200">
                <select class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center">
                    <option value="Teacher">Teacher</option>
                    <option value="Admin">Admin</option>
                </select>
            </td>
            <td class="p-1 border border-gray-200 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded"><i class="fa-solid fa-trash"></i></button></td>
        `;
    } else if (type === 'clubTeachers') {
        tr.innerHTML = `
            <td class="p-1 border border-gray-200">
                <input type="text" list="teacherDatalist" oninput="updateDatalistForInput(this)" onfocus="updateDatalistForInput(this)" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-blue-50/30" placeholder="พิมพ์ชื่อเพื่อค้นหา/เลือก...">
            </td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold text-green-700" placeholder="ระบุชื่อชุมนุม"></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center" value="${currentTerm}"></td>
            <td class="p-1 border border-gray-200"><input type="text" class="w-full border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-center" value="${currentYear}"></td>
            <td class="p-1 border border-gray-200 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded"><i class="fa-solid fa-trash"></i></button></td>
        `;
    }
    tbody.appendChild(tr);
}

function saveDbData() {
    const type = document.querySelector('input[name="uploadType"]:checked').value;
    const overwrite = document.getElementById('overwriteCheck').checked;
    const tbody = document.getElementById('dbFormBody');
    const rows = tbody.querySelectorAll('tr');
    let dataToSave = [];

    rows.forEach(tr => {
        const inputs = tr.querySelectorAll('input, select');
        let rowData = Array.from(inputs).map(inp => inp.value.trim());

        if (rowData[0] === "") return; 

        if (type === 'teachingLoad') {
            let rooms = [];
            let parts = rowData[4].split(',');
            parts.forEach(p => {
                let range = p.split('-');
                if (range.length === 2) {
                    let start = parseInt(range[0].trim());
                    let end = parseInt(range[1].trim());
                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) rooms.push(i.toString());
                    } else { rooms.push(p.trim()); }
                } else { rooms.push(p.trim()); }
            });
            rooms = [...new Set(rooms)].filter(r => r !== "");
            rooms.forEach(r => {
                dataToSave.push([rowData[0], rowData[1], rowData[2], rowData[3], r, rowData[5], rowData[6]]);
            });
        } else if (type === 'teachers') {
            // [username, name, advisor_room, role] -> [username, 'Password@123', name, advisor_room, role]
            if (rowData.length === 4) {
                dataToSave.push([rowData[0], 'Password@123', rowData[1], rowData[2], rowData[3]]);
            } else {
                dataToSave.push(rowData);
            }
        } else {
            dataToSave.push(rowData);
        }
    });

    if(dataToSave.length === 0) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วนอย่างน้อย 1 รายการครับ");
        return;
    }

    const btn = document.getElementById('btnSaveDb');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    btn.disabled = true;

    google.script.run.withSuccessHandler(function(msg){
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> บันทึกข้อมูลตาราง';
        btn.disabled = false;
        let text = (typeof msg === 'object' && msg !== null && msg.message) ? msg.message : msg;
        showToast("บันทึกสำเร็จ", text);
        
        if(type === 'teachers') loadTeacherNamesForDatalist();
        
        renderFormTable(); 
        document.getElementById('overwriteCheck').checked = false; 
    }).saveDatabaseWeb(type, dataToSave, overwrite);
}

// ==========================================
// ฟังก์ชันสำหรับรายงานนักเรียนติด "ซ" แยกรายครู/รายวิชา (NEW)
// ==========================================

let globalRemedialData = null;

function openMyRemedialModal() {
    const modal = document.getElementById('myRemedialModal');
    const teacherNameDisplay = document.getElementById('myRemedialTeacherName');
    const loading = document.getElementById('myRemedialLoading');
    const content = document.getElementById('myRemedialContent');
    const statsDiv = document.getElementById('myRemedialStats');
    const tbody = document.getElementById('myRemedialBody');
    const summaryText = document.getElementById('myRemedialSummaryText');

    teacherNameDisplay.innerText = "ครูผู้สอน: " + formatTeacherName(currentTeacherName) + " | ภาคเรียนที่ " + currentTerm + "/" + currentYear + " (" + currentPeriod + ")";
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');

    let curTY = currentTerm + "/" + currentYear;

    google.script.run.withSuccessHandler(function(res) {
        loading.classList.add('hidden');
        content.classList.remove('hidden');

        if (!res || !res.success || res.data.length === 0) {
            statsDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center sm:col-span-3">
                    <i class="fa-solid fa-circle-check text-green-500 text-3xl mb-2"></i>
                    <h4 class="font-bold text-green-800 text-lg">ไม่พบนักเรียนติด "ซ"</h4>
                    <p class="text-xs text-green-600">นักเรียนในรายวิชาที่คุณสอนผ่านเกณฑ์ทั้งหมดในรอบการประเมินนี้</p>
                </div>
            `;
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-400 font-medium">ไม่พบรายการนักเรียนที่ติด ซ</td></tr>';
            summaryText.innerText = "พบนักเรียนติด ซ ทั้งหมด 0 คน";
            return;
        }

        let total = res.data.length;
        let subjectsCount = new Set(res.data.map(d => d.subjectCode)).size;

        statsDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-red-600">${total}</div>
                <div class="text-xs text-red-800 font-bold mt-1">นักเรียนที่ติด ซ ทั้งหมด (คน)</div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-blue-600">${subjectsCount}</div>
                <div class="text-xs text-blue-800 font-bold mt-1">จำนวนรายวิชาที่มีนักเรียนติด ซ</div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-amber-600">${currentPeriod}</div>
                <div class="text-xs text-amber-800 font-bold mt-1">รอบการประเมินปัจจุบัน</div>
            </div>
        `;

        tbody.innerHTML = '';
        res.data.forEach((item, idx) => {
            let cleanLvl = item.level.toString().replace(/[ม\.]/g, '').trim();
            tbody.innerHTML += `
                <tr class="hover:bg-red-50/50 border-b border-gray-100">
                    <td class="p-3 text-center text-gray-500 font-medium">${idx + 1}</td>
                    <td class="p-3 font-mono text-xs font-bold text-gray-800">${item.studentId}</td>
                    <td class="p-3 font-medium text-gray-800">${item.studentName}</td>
                    <td class="p-3 text-center text-xs font-semibold text-blue-700">ม.${cleanLvl}/${item.room}</td>
                    <td class="p-3 text-xs">
                        <span class="font-bold text-gray-800 block">${item.subjectCode} ${item.subjectName}</span>
                    </td>
                    <td class="p-3 text-center">
                        <span class="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold">ติด ${item.status}</span>
                    </td>
                </tr>
            `;
        });

        summaryText.innerText = "พบนักเรียนติด ซ ทั้งหมด " + total + " คน (" + subjectsCount + " รายวิชา)";
    }).getTeacherRemedialReport(currentPeriod, curTY, currentTeacherName);
}

function closeMyRemedialModal() {
    document.getElementById('myRemedialModal').classList.add('hidden');
}

function printMyRemedial() {
    window.print();
}

function loadTeacherRemedialReport() {
    const termVal = document.getElementById('remedialTermSelect').value;
    const periodVal = document.getElementById('remedialPeriodSelect').value;
    const teacherVal = document.getElementById('remedialTeacherSelect').value;

    if(!termVal) { alert("กรุณาเลือกภาคเรียน/ปีการศึกษา"); return; }

    const loading = document.getElementById('remedialLoading');
    const container = document.getElementById('remedialContainer');
    const errMsg = document.getElementById('remedialErrorMsg');
    const pdfBtn = document.getElementById('btnRemedialPdf');

    container.classList.add('hidden');
    pdfBtn.classList.add('hidden');
    errMsg.classList.add('hidden');
    loading.classList.remove('hidden');

    google.script.run.withSuccessHandler(function(res) {
        loading.classList.add('hidden');
        if (!res.success) {
            errMsg.innerText = res.message || "เกิดข้อผิดพลาดในการดึงข้อมูล";
            errMsg.classList.remove('hidden');
            return;
        }

        globalRemedialData = {
            ...res,
            termYear: termVal,
            period: periodVal,
            teacherFilter: teacherVal
        };

        renderTeacherRemedialReport(res, termVal, periodVal, teacherVal);
    }).getTeacherRemedialReport(periodVal, termVal, teacherVal);
}

function renderTeacherRemedialReport(res, termVal, periodVal, teacherVal) {
    const container = document.getElementById('remedialContainer');
    const pdfBtn = document.getElementById('btnRemedialPdf');

    if (res.data.length === 0) {
        container.innerHTML = `
            <div class="bg-green-50 border border-green-200 text-green-700 p-8 rounded-xl text-center font-bold">
                <i class="fa-solid fa-circle-check text-4xl mb-3 text-green-500 block"></i>
                <h4 class="text-xl">ไม่พบนักเรียนติด "ซ" ในเงื่อนไขที่เลือก</h4>
                <p class="text-sm text-green-600 font-normal mt-1">ภาคเรียน ${termVal} (${periodVal}) - นักเรียนทุกคนมีผลการเรียนผ่านเกณฑ์ปกติ</p>
            </div>
        `;
        container.classList.remove('hidden');
        return;
    }

    let totalStudents = res.data.length;
    let totalTeachers = res.stats.length;
    let subjectsSet = new Set(res.data.map(d => d.subjectCode));

    let html = `
        <!-- สถิติภาพรวม -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-sm">
                <div class="text-xs text-red-100 font-medium">จำนวนนักเรียนติด "ซ" ทั้งหมด</div>
                <div class="text-3xl font-black mt-1">${totalStudents} <span class="text-sm font-normal">คน</span></div>
            </div>
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm">
                <div class="text-xs text-blue-100 font-medium">ครูผู้สอนที่พบนักเรียนติด ซ</div>
                <div class="text-3xl font-black mt-1">${totalTeachers} <span class="text-sm font-normal">ท่าน</span></div>
            </div>
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-sm">
                <div class="text-xs text-purple-100 font-medium">จำนวนรายวิชาที่พบ</div>
                <div class="text-3xl font-black mt-1">${subjectsSet.size} <span class="text-sm font-normal">วิชา</span></div>
            </div>
        </div>

        <!-- พื้นที่แสดงผลสำหรับพิมพ์/Export PDF -->
        <div id="remedialPrintArea" class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm" style="font-family: 'Sarabun', sans-serif;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="font-size: 18px; font-weight: bold; margin: 0; color: #1e3a8a;">แบบรายงานผลการเรียนที่ไม่ผ่านเกณฑ์ (ติด ซ / มส / มผ)</h2>
                <p style="font-size: 13px; font-weight: bold; margin: 4px 0 0 0; color: #374151;">
                    โรงเรียนมกุฎเมืองราชวิทยาลัย ภาคเรียนที่ ${termVal} (${periodVal})
                </p>
                ${teacherVal !== 'ALL' ? `<p style="font-size: 12px; color: #dc2626; font-weight: bold; margin-top: 2px;">ครูผู้สอน: ${formatTeacherName(teacherVal)}</p>` : ''}
            </div>

            <!-- สรุปแยกตามครูผู้สอน -->
    `;

    // จัดกลุ่มข้อมูลตามครูผู้สอน
    let groupedByTeacher = {};
    res.data.forEach(item => {
        let t = item.teacher || "ไม่ระบุครูผู้สอน";
        if (!groupedByTeacher[t]) groupedByTeacher[t] = [];
        groupedByTeacher[t].push(item);
    });

    for (let teacherName in groupedByTeacher) {
        let items = groupedByTeacher[teacherName];
        let tNameFormatted = formatTeacherName(teacherName);

        html += `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-size: 13px; color: #1e293b;">
                        <i class="fa-solid fa-chalkboard-user" style="color: #2563eb; margin-right: 6px;"></i> ครูผู้สอน: ${tNameFormatted}
                    </span>
                    <span style="font-size: 11px; background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-weight: bold;">
                        ติด ซ ทั้งหมด ${items.length} รายการ
                    </span>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px; text-align: center;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 1px solid #000;">
                            <th style="border: 1px solid #000; width: 40px; padding: 5px;">ลำดับ</th>
                            <th style="border: 1px solid #000; width: 70px; padding: 5px;">รหัสประจำตัว</th>
                            <th style="border: 1px solid #000; text-align: left; padding: 5px 8px;">ชื่อ - สกุล</th>
                            <th style="border: 1px solid #000; width: 65px; padding: 5px;">ระดับชั้น</th>
                            <th style="border: 1px solid #000; width: 75px; padding: 5px;">รหัสวิชา</th>
                            <th style="border: 1px solid #000; text-align: left; padding: 5px 8px;">ชื่อรายวิชา</th>
                            <th style="border: 1px solid #000; width: 60px; padding: 5px;">ผลประเมิน</th>
                            <th style="border: 1px solid #000; width: 110px; padding: 5px;">ผลสอบแก้ตัว/ลงนาม</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach((st, idx) => {
            let cleanLvl = st.level.toString().replace(/[ม\.]/g, '').trim();
            html += `
                <tr style="border-bottom: 1px solid #cbd5e1;">
                    <td style="border: 1px solid #000; padding: 4px;">${idx + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${st.studentId}</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: left; white-space: nowrap;">${st.studentName}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">ม.${cleanLvl}/${st.room}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${st.subjectCode}</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: left;">${st.subjectName}</td>
                    <td style="border: 1px solid #000; padding: 4px; color: red; font-weight: bold;">ติด ${st.status}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-size: 9px; color: #64748b;">[ &nbsp; ] ผ่าน &nbsp; [ &nbsp; ] ไม่ผ่าน</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 15px; font-size: 11px; padding-right: 20px;">
                    ลงชื่อ...................................................................ครูผู้สอน<br>
                    ( ${tNameFormatted} )<br>
                    วันที่........./........./...........
                </div>
            </div>
        `;
    }

    html += `</div>`;

    container.innerHTML = html;
    container.classList.remove('hidden');
    pdfBtn.classList.remove('hidden');
}

function exportRemedialPDF() {
    const element = document.getElementById('remedialPrintArea');
    const term = document.getElementById('remedialTermSelect').value.replace('/', '-');
    const period = document.getElementById('remedialPeriodSelect').value;
    const btn = document.getElementById('btnRemedialPdf');
    const orig = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> สร้าง PDF...';
    btn.disabled = true;

    html2pdf().set({
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: `รายงานนักเรียนติดซ_${period}_เทอม_${term}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        pagebreak: { mode: 'css', avoid: ['tr', 'thead', '.room-page'] },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowY: 0 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(element).save().then(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
    });
}


// ==========================================
// ส่วนเพิ่มเติม: ระบบบันทึกสำเนาคะแนน (Score Submissions)
// ==========================================
let currentLoadedSubmission = null;

function updateUIForLockState(submission, subjData) {
    const isLocked = (submission.status === "Submitted" || submission.status === "Approved");
    
    // 1. จัดการ Badge สถานะ
    const badge = document.getElementById("submissionBadge");
    if (badge) {
        badge.classList.remove("hidden", "bg-gray-100", "text-gray-800", "border-gray-200", "bg-orange-50", "text-orange-700", "border-orange-200", "bg-green-50", "text-green-700", "border-green-200", "bg-red-50", "text-red-700", "border-red-200");
        
        if (submission.status === "Submitted") {
            badge.innerText = "ส่งสำเนาแล้ว - รอฝ่ายวิชาการอนุมัติ";
            badge.classList.add("bg-orange-50", "text-orange-700", "border-orange-200");
            badge.classList.remove("hidden");
        } else if (submission.status === "Approved") {
            badge.innerText = "อนุมัติแล้ว - ล็อกคะแนน";
            badge.classList.add("bg-green-50", "text-green-700", "border-green-200");
            badge.classList.remove("hidden");
        } else if (submission.status === "Rejected") {
            badge.innerText = "ถูกตีกลับแก้ไข";
            badge.classList.add("bg-red-50", "text-red-700", "border-red-200");
            badge.classList.remove("hidden");
        } else {
            badge.innerText = "แบบร่าง (ยังไม่ส่งสำเนา)";
            badge.classList.add("bg-gray-100", "text-gray-800", "border-gray-200");
            badge.classList.remove("hidden");
        }
    }

    // 2. จัดการเหตุผลการส่งกลับ (ถ้ามี)
    const rejectReasonText = document.getElementById("rejectReasonText");
    if (rejectReasonText) {
        if (submission.status === "Rejected" && submission.reject_reason) {
            rejectReasonText.innerText = "ตีกลับ: " + submission.reject_reason;
            rejectReasonText.classList.remove("hidden");
        } else {
            rejectReasonText.classList.add("hidden");
        }
    }

    // 3. ซ่อน/แสดงปุ่มต่างๆ
    const saveBtn = document.getElementById("saveBtn");
    const submitCopyBtn = document.getElementById("submitCopyBtn");
    const printBtn = document.getElementById("printBtn");

    if (isLocked) {
        if (saveBtn) saveBtn.classList.add("hidden");
        if (submitCopyBtn) submitCopyBtn.classList.add("hidden");
        if (printBtn) printBtn.classList.remove("hidden");
    } else {
        if (saveBtn) saveBtn.classList.remove("hidden");
        if (submitCopyBtn) submitCopyBtn.classList.remove("hidden");
        if (printBtn) printBtn.classList.remove("hidden");
    }

    // 4. ล็อกช่องคะแนน
    document.querySelectorAll('#studentTableBody tr input, #studentTableBody tr select').forEach(el => {
        el.disabled = isLocked;
        if (isLocked) {
            el.classList.add("bg-gray-100", "text-gray-500", "cursor-not-allowed");
        } else {
            el.classList.remove("bg-gray-100", "text-gray-500", "cursor-not-allowed");
        }
    });

    // 5. ล็อกช่องหัวตาราง
    document.querySelectorAll('#tableHeader input').forEach(el => {
        el.disabled = isLocked;
        if (isLocked) {
            el.classList.add("bg-gray-50", "text-gray-500", "cursor-not-allowed");
        } else {
            el.classList.remove("bg-gray-50", "text-gray-500", "cursor-not-allowed");
        }
    });
}

function saveHeaders() {
    const select = document.getElementById("subjectSelect");
    if (!select || select.value === "") return;
    const subjData = JSON.parse(select.value);
    let targetRoom = subjData.subjectCode === "CLUB" ? subjData.subjectName : subjData.room;
    
    let headerValues = [];
    document.querySelectorAll('#tableHeader input').forEach(input => {
        headerValues.push(input.value);
    });
    
    let key = 'headers_' + currentTerm + '_' + currentYear + '_' + currentPeriod + '_' + subjData.subjectCode + '_' + targetRoom;
    localStorage.setItem(key, JSON.stringify(headerValues));
}

function loadHeaders() {
    const select = document.getElementById("subjectSelect");
    if (!select || select.value === "") return;
    const subjData = JSON.parse(select.value);
    let targetRoom = subjData.subjectCode === "CLUB" ? subjData.subjectName : subjData.room;
    
    let key = 'headers_' + currentTerm + '_' + currentYear + '_' + currentPeriod + '_' + subjData.subjectCode + '_' + targetRoom;
    let stored = localStorage.getItem(key);
    if (stored) {
        let headerValues = JSON.parse(stored);
        let inputs = document.querySelectorAll('#tableHeader input');
        inputs.forEach((input, index) => {
            if (headerValues[index] !== undefined) {
                input.value = headerValues[index];
            }
        });
    }
}

function openSubmitCopyModal() {
    if (confirm("ต้องการส่งสำเนาคะแนนสำหรับรายวิชานี้ใช่หรือไม่?\n\n* หลังจากส่งแล้ว คะแนนจะถูกล็อกไม่ให้แก้ไขได้อีก ยกเว้นฝ่ายวิชาการจะส่งกลับมาให้แก้ไข")) {
        submitScoreCopyData();
    }
}

function submitScoreCopyData() {
    if (currentSystemStatus === "CLOSED") {
        alert("ขออภัย! ผู้ดูแลระบบปิดการทำงานของระบบชั่วคราวแล้ว");
        return;
    }
    
    const btn = document.getElementById("submitCopyBtn");
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งสำเนา...';

    const select = document.getElementById("subjectSelect");
    const subjData = JSON.parse(select.value);
    let targetRoom = subjData.subjectCode === "CLUB" ? subjData.subjectName : subjData.room;
    
    // อ่านคะแนน
    let studentDataArr = [];
    document.querySelectorAll('#studentTableBody tr').forEach(tr => {
        studentDataArr.push({
            id: tr.querySelector('.student-id').innerText,
            name: tr.querySelector('.student-name').innerText,
            s1: tr.querySelector('.score-1') ? tr.querySelector('.score-1').value : "",
            s2: tr.querySelector('.score-2') ? tr.querySelector('.score-2').value : "",
            s3: tr.querySelector('.score-3') ? tr.querySelector('.score-3').value : "",
            s4: tr.querySelector('.score-4') ? tr.querySelector('.score-4').value : "",
            s5: tr.querySelector('.score-5') ? tr.querySelector('.score-5').value : "",
            s6: tr.querySelector('.score-6') ? tr.querySelector('.score-6').value : "",
            s7: tr.querySelector('.score-7') ? tr.querySelector('.score-7').value : "",
            s8: tr.querySelector('.score-8') ? tr.querySelector('.score-8').value : "",
            s9: tr.querySelector('.score-9') ? tr.querySelector('.score-9').value : "",
            s10: tr.querySelector('.score-10') ? tr.querySelector('.score-10').value : "",
            status: tr.querySelector('.status-select') ? tr.querySelector('.status-select').value : "ปกติ"
        });
    });

    // อ่านหัวข้อ
    let headers = [];
    document.querySelectorAll('#tableHeader input').forEach(input => {
        headers.push(input.value || "");
    });

    google.script.run.withSuccessHandler(function(res) {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (res.success) {
            showToast("สำเร็จ", "ส่งสำเนาคะแนนและล็อกข้อมูลเรียบร้อยแล้ว");
            loadStudents();
        } else {
            alert("เกิดข้อผิดพลาด: " + res.message);
        }
    }).submitScoreCopy({
        term: currentTerm,
        year: currentYear,
        period: currentPeriod,
        subjectCode: subjData.subjectCode,
        subjectName: subjData.subjectName,
        classLevel: subjData.classLevel,
        room: subjData.room,
        teacher: currentTeacherName,
        students: studentDataArr,
        headers: headers
    });
}

function printScoreCopy() {
    const select = document.getElementById("subjectSelect");
    if (select.value === "") return;
    const subjData = JSON.parse(select.value);
    let targetRoom = subjData.subjectCode === "CLUB" ? subjData.subjectName : subjData.room;
    let clLevel = subjData.subjectCode === "CLUB" ? "รวม" : subjData.classLevel.toString().replace(/[ม\\.]/g, '').trim();

    // 1. อ่านข้อมูลหัวข้อคอลัมน์ (Headers)
    let headers = ["", "", "", "", "", "", "", "", "", ""];
    if (currentLoadedSubmission && currentLoadedSubmission.snapshot_grades && currentLoadedSubmission.snapshot_grades.headers) {
        headers = currentLoadedSubmission.snapshot_grades.headers;
    } else {
        let key = 'headers_' + currentTerm + '_' + currentYear + '_' + currentPeriod + '_' + subjData.subjectCode + '_' + targetRoom;
        let stored = localStorage.getItem(key);
        if (stored) headers = JSON.parse(stored);
    }

    // กรองหาคอลัมน์ที่ใช้งาน
    let activeCols = [];
    if (subjData.subjectCode === "CLUB") {
        activeCols = [];
    } else if (subjData.subjectCode === "ACT99") {
        activeCols = [
            { index: 1, name: "แนะแนว" },
            { index: 2, name: "กิจกรรมเพื่อสังคม" },
            { index: 3, name: "ชุมนุม" },
            { index: 4, name: "รักการอ่าน" }
        ];
    } else {
        headers.forEach((h, idx) => {
            if (h && h.trim() !== "") {
                activeCols.push({ index: idx + 1, name: h });
            }
        });
        if (activeCols.length === 0) {
            for (let i = 1; i <= 5; i++) {
                activeCols.push({ index: i, name: "ช่อง " + i });
            }
        }
    }

    // 2. ดึงข้อมูลรายชื่อและคะแนนนักเรียน
    let students = [];
    document.querySelectorAll('#studentTableBody tr').forEach(tr => {
        let sData = {
            no: tr.cells[0].innerText,
            id: tr.querySelector('.student-id').innerText,
            name: tr.querySelector('.student-name').innerText,
            status: tr.querySelector('.status-select') ? tr.querySelector('.status-select').value : "ปกติ"
        };
        for (let i = 1; i <= 10; i++) {
            let sInput = tr.querySelector('.score-' + i);
            sData['s' + i] = sInput ? sInput.value : "";
        }
        students.push(sData);
    });

    // 3. ประกอบโครงสร้างเอกสารพิมพ์
    let titleStr = "แบบบันทึกสำเนาคะแนนเก็บนักเรียน (สำเนา ปพ.5)";
    if (subjData.subjectCode === "CLUB") titleStr = "แบบบันทึกผลการประเมินกิจกรรมชุมนุม";
    else if (subjData.subjectCode === "ACT99") titleStr = "แบบบันทึกผลกิจกรรมพัฒนาผู้เรียน";

    let html = `
        <div style="font-family: 'Sarabun', sans-serif; padding: 10px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #000;">${titleStr}</h2>
                <h3 style="font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">โรงเรียนมกุฎเมืองราชวิทยาลัย</h3>
                <p style="font-size: 14px; margin: 5px 0 15px 0;">
                    <b>ภาคเรียนที่:</b> ${currentTerm} <b>ปีการศึกษา:</b> ${currentYear} <b>ช่วงเวลา:</b> ${currentPeriod}
                </p>
                <div style="text-align: left; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background-color: #f8fafc; margin-bottom: 20px;">
                    <div><b>รายวิชา:</b> ${subjData.subjectCode !== 'CLUB' ? subjData.subjectCode + ' ' : ''}${subjData.subjectName}</div>
                    <div><b>ชั้น/ห้อง:</b> ${subjData.subjectCode === 'CLUB' ? 'ทุกห้อง' : 'ม.' + clLevel + '/' + subjData.room}</div>
                    <div><b>ครูผู้สอน:</b> ${currentTeacherName}</div>
                    <div><b>จำนวนนักเรียน:</b> ${students.length} คน</div>
                    ${currentLoadedSubmission && currentLoadedSubmission.submitted_at ? `<div><b>วันที่ส่งสำเนา:</b> ${currentLoadedSubmission.submitted_at}</div>` : ''}
                    <div><b>สถานะสำเนา:</b> ${currentLoadedSubmission ? (currentLoadedSubmission.status === 'Approved' ? 'อนุมัติแล้ว' : currentLoadedSubmission.status === 'Submitted' ? 'ส่งแล้ว รออนุมัติ' : 'แบบร่าง') : 'แบบร่าง'}</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 12px; text-align: center;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1px solid #000;">
                        <th style="border: 1px solid #000; width: 45px; padding: 6px; font-weight: bold;">เลขที่</th>
                        <th style="border: 1px solid #000; width: 85px; padding: 6px; font-weight: bold;">เลขประจำตัว</th>
                        <th style="border: 1px solid #000; text-align: left; padding: 6px 10px; font-weight: bold;">ชื่อ - นามสกุล</th>
                        ${activeCols.map(col => `<th style="border: 1px solid #000; padding: 6px; font-weight: bold; min-width: 50px;">${col.name}</th>`).join('')}
                        <th style="border: 1px solid #000; width: 90px; padding: 6px; font-weight: bold;">ผลการประเมิน</th>
                    </tr>
                </thead>
                <tbody>
    `;

    students.forEach(st => {
        html += `
            <tr style="border-bottom: 1px solid #000;">
                <td style="border: 1px solid #000; padding: 5px;">${st.no}</td>
                <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${st.id}</td>
                <td style="border: 1px solid #000; padding: 5px 10px; text-align: left; white-space: nowrap;">${st.name}</td>
                ${activeCols.map(col => {
                    let val = st['s' + col.index];
                    return `<td style="border: 1px solid #000; padding: 5px;">${val !== undefined && val !== null ? val : ''}</td>`;
                }).join('')}
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold; ${st.status !== 'ปกติ' && st.status ? 'color: red;' : ''}">${st.status || 'ปกติ'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>

            <div style="margin-top: 35px; page-break-inside: avoid; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 13px; text-align: center;">
                <div style="padding: 10px;">
                    ลงชื่อ.................................................................ครูผู้สอน<br>
                    ( ${currentTeacherName} )<br>
                    ตำแหน่ง.................................................................<br>
                    ......./......./.......
                </div>
                <div style="padding: 10px;">
                    ลงชื่อ.................................................................หัวหน้ากลุ่มสาระการเรียนรู้<br>
                    (...................................................................)<br>
                    ตำแหน่ง.................................................................<br>
                    ......./......./.......
                </div>
            </div>
            
            <div style="margin-top: 25px; page-break-inside: avoid; text-align: center; font-size: 13px;">
                <div style="display: inline-block; width: 320px; padding: 10px;">
                    ลงชื่อ.................................................................หัวหน้างานวัดผล/วิชาการ<br>
                    (...................................................................)<br>
                    ......./......./.......
                </div>
            </div>
        </div>
    `;

    document.getElementById("printArea").innerHTML = html;
    document.getElementById("printPreviewModal").classList.remove("hidden");
}

function closePrintPreviewModal() {
    document.getElementById("printPreviewModal").classList.add("hidden");
}

function triggerBrowserPrint() {
    const printArea = document.getElementById("printArea");
    const w = window.open();
    w.document.write(`
        <html>
            <head>
                <title>พิมพ์สำเนาคะแนน</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 20px; background: white; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${printArea.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                <\/script>
            </body>
        </html>
    `);
    w.document.close();
}

function downloadScoreCopyPDF() {
    const element = document.getElementById('printArea');
    const select = document.getElementById("subjectSelect");
    const subjData = JSON.parse(select.value);
    const filename = `สำเนาคะแนน_${subjData.subjectCode}_ห้อง_${subjData.room}_เทอม_${currentTerm}-${currentYear}.pdf`;
    
    html2pdf().set({
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
}


// ==========================================
// ส่วนเพิ่มเติม: ระบบตรวจสอบและอนุมัติสำหรับวิชาการ
// ==========================================
function loadSubmissionTracker() {
    const termVal = document.getElementById("approveTermSelect").value;
    const period = document.getElementById("approvePeriodSelect").value;
    if (!termVal) return;

    const parts = termVal.split('/');
    const term = parts[0];
    const year = parts[1];

    const loader = document.getElementById("approveLoading");
    const tbody = document.getElementById("approveTableBody");

    loader.classList.remove("hidden");
    tbody.innerHTML = '';

    google.script.run.withSuccessHandler(function(res) {
        loader.classList.add("hidden");
        if (res.success) {
            const list = res.submissions;
            if (list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500">ไม่มีรายวิชาใดส่งสำเนาคะแนนเข้ามาในภาคเรียนนี้</td></tr>`;
                return;
            }

            list.forEach((sub, index) => {
                let statusBadge = "";
                if (sub.status === "Submitted") {
                    statusBadge = `<span class="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-200">รออนุมัติ</span>`;
                } else if (sub.status === "Approved") {
                    statusBadge = `<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-200">อนุมัติแล้ว</span>`;
                } else if (sub.status === "Rejected") {
                    statusBadge = `<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-200" title="เหตุผล: ${sub.rejectReason || ''}">ตีกลับแก้ไข</span>`;
                }

                let clLevel = sub.classLevel ? sub.classLevel.toString().replace(/[ม\\.]/g, '').trim() : '';
                let roomStr = sub.subjectCode === "CLUB" ? "รวม" : "ม." + clLevel + "/" + sub.room;

                let actionHtml = "";
                if (sub.status === "Submitted") {
                    actionHtml = `
                        <div class="flex gap-2 justify-center">
                            <button onclick="adminApproveSubmission('${sub.subjectCode}', '${sub.room}')" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs transition shadow-sm">
                                อนุมัติ
                            </button>
                            <button onclick="adminRejectSubmission('${sub.subjectCode}', '${sub.room}')" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs transition shadow-sm">
                                ตีกลับ
                            </button>
                        </div>
                    `;
                } else if (sub.status === "Approved") {
                    actionHtml = `
                        <div class="flex gap-2 justify-center">
                            <button onclick="adminRejectSubmission('${sub.subjectCode}', '${sub.room}', true)" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold text-xs transition shadow-sm">
                                ปลดล็อก/ตีกลับ
                            </button>
                        </div>
                    `;
                } else {
                    actionHtml = `<span class="text-xs text-gray-400 font-medium">รอครูแก้ไข</span>`;
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50/50">
                        <td class="p-3 text-center text-gray-500 font-mono">${index + 1}</td>
                        <td class="p-3 font-bold font-mono text-gray-700">${sub.subjectCode}</td>
                        <td class="p-3 font-medium text-gray-800">${sub.subjectName}</td>
                        <td class="p-3 text-center font-semibold text-gray-600">${roomStr}</td>
                        <td class="p-3 text-gray-600">${sub.teacher}</td>
                        <td class="p-3 text-center text-xs text-gray-500 font-mono">${sub.submittedAt || '-'}</td>
                        <td class="p-3 text-center">${statusBadge}</td>
                        <td class="p-3 text-center">${actionHtml}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 font-bold">เกิดข้อผิดพลาด: ${res.message}</td></tr>`;
        }
    }).adminGetSubmissions(term, year, period);
}

function adminApproveSubmission(subjectCode, room) {
    if (!confirm("ยืนยันการอนุมัติสำเนาคะแนนและล็อกวิชานี้ใช่หรือไม่?\n\n* หลังจากอนุมัติแล้ว คุณครูจะไม่สามารถแก้ไขคะแนนได้อีก")) return;

    const termVal = document.getElementById("approveTermSelect").value;
    const period = document.getElementById("approvePeriodSelect").value;
    const parts = termVal.split('/');
    const term = parts[0];
    const year = parts[1];

    google.script.run.withSuccessHandler(function(res) {
        if (res.success) {
            showToast("อนุมัติแล้ว", "อนุมัติสำเนาคะแนนและทำการล็อกคะแนนเรียบร้อยแล้ว");
            loadSubmissionTracker();
        } else {
            alert("เกิดข้อผิดพลาด: " + res.message);
        }
    }).adminUpdateSubmission(term, year, period, subjectCode, room, "Approved", "");
}

function adminRejectSubmission(subjectCode, room, wasApproved = false) {
    let msg = wasApproved ? "ต้องการปลดล็อกคะแนนรายวิชานี้เพื่อให้ครูเข้ามาแก้ไขใหม่ใช่หรือไม่?" : "ระบุเหตุผลการตีกลับแก้ไข:";
    let reason = prompt(msg, "");
    if (reason === null) return; // กดยกเลิก
    if (!wasApproved && reason.trim() === "") {
        alert("กรุณาระบุเหตุผลการตีกลับแก้ไข!");
        return;
    }

    const termVal = document.getElementById("approveTermSelect").value;
    const period = document.getElementById("approvePeriodSelect").value;
    const parts = termVal.split('/');
    const term = parts[0];
    const year = parts[1];

    google.script.run.withSuccessHandler(function(res) {
        if (res.success) {
            showToast("ส่งกลับเรียบร้อย", "ส่งวิชานี้กลับไปให้แก้ไขและปลดล็อกเรียบร้อยแล้ว");
            loadSubmissionTracker();
        } else {
            alert("เกิดข้อผิดพลาด: " + res.message);
        }
    }).adminUpdateSubmission(term, year, period, subjectCode, room, "Rejected", reason);
}


function showToast(title, desc) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    const toastTitle = document.getElementById("toastTitle");
    const toastDesc = document.getElementById("toastDesc");
    
    let displayDesc = desc;
    if (typeof desc === 'object' && desc !== null) {
        displayDesc = desc.message || desc.text || (desc.success ? "บันทึกข้อมูลเรียบร้อยแล้ว" : JSON.stringify(desc));
    }
    
    if (toastTitle) toastTitle.innerText = title || "สำเร็จ!";
    if (toastDesc) toastDesc.innerText = displayDesc || "ระบบทำงานเรียบร้อย";

    toast.classList.remove("translate-y-24", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(function() {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-24", "opacity-0");
    }, 3500);
}

