(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "tasknova.v1";
  const CATEGORIES = ["Personal", "Work", "Study", "Health", "Other"];
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const dateLabel = (iso) => {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    if (iso === todayISO()) return "Today";
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    if (iso === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`) return "Tomorrow";
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  };
  const isOverdue = task => !task.completed && task.dueDate && task.dueDate < todayISO();
  const defaultState = () => ({
    tasks: [
      {id:uid(),title:"Finish project documentation",description:"Polish the write-up and add screenshots.",priority:"high",category:"Study",dueDate:todayISO(),dueTime:"17:00",completed:false,createdAt:new Date().toISOString()},
      {id:uid(),title:"Revise JavaScript concepts",description:"Review arrays, events and local storage.",priority:"medium",category:"Study",dueDate:todayISO(),dueTime:"19:00",completed:false,createdAt:new Date().toISOString()},
      {id:uid(),title:"Move your body for 20 minutes",description:"A short walk or a quick workout.",priority:"low",category:"Health",dueDate:todayISO(),dueTime:"20:00",completed:true,createdAt:new Date().toISOString()},
      {id:uid(),title:"Read 10 pages",description:"A few pages are better than none.",priority:"low",category:"Personal",dueDate:"",dueTime:"",completed:false,createdAt:new Date().toISOString()}
    ],
    habits: [
      {id:uid(),name:"Read a book",icon:"◈",history:{}},
      {id:uid(),name:"Exercise",icon:"❋",history:{}},
      {id:uid(),name:"Drink water",icon:"☼",history:{}}
    ],
    theme:"dark", streak:0, lastActiveDate:"", focusSessions:0
  });
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.habits)) throw new Error("Invalid saved data");
      return {
        tasks: data.tasks.filter(t => t && typeof t.title === "string").map(t => ({
          id:String(t.id || uid()), title:String(t.title).slice(0,120), description:String(t.description || "").slice(0,600),
          priority:["high","medium","low"].includes(t.priority)?t.priority:"medium", category:CATEGORIES.includes(t.category)?t.category:"Other",
          dueDate:typeof t.dueDate==="string"?t.dueDate:"", dueTime:typeof t.dueTime==="string"?t.dueTime:"",
          completed:Boolean(t.completed), createdAt:t.createdAt || new Date().toISOString()
        })),
        habits:data.habits.filter(h=>h&&typeof h.name==="string").map(h=>({id:String(h.id||uid()),name:String(h.name).slice(0,70),icon:String(h.icon||"✦"),history:h.history&&typeof h.history==="object"?h.history:{}})),
        theme:data.theme==="light"?"light":"dark", streak:Number.isFinite(data.streak)?data.streak:0,
        lastActiveDate:typeof data.lastActiveDate==="string"?data.lastActiveDate:"", focusSessions:Number.isFinite(data.focusSessions)?data.focusSessions:0
      };
    } catch (error) {
      console.warn("TaskNova data could not be loaded:", error);
      return defaultState();
    }
  }
  let state = loadState();
  let currentView = "dashboard", currentFilter = "all", categoryFilter = "", searchQuery = "";
  let calendarCursor = new Date(), selectedDate = todayISO(), focusTaskId = null;
  let timerDuration = 25*60, timerRemaining = timerDuration, timerInterval = null, timerRunning = false, sessionCount = 0;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { toast("Could not save. Browser storage may be full.", "error"); }
  }
  function toast(message, type="success") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    $("#toastRegion").append(node);
    window.setTimeout(() => node.remove(), 3200);
  }
  function markActiveDay() {
    const today = todayISO();
    if (state.lastActiveDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
      const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`;
      state.streak = state.lastActiveDate === yesterdayISO ? state.streak + 1 : 1;
      state.lastActiveDate = today;
      saveState();
    }
  }
  function applyTheme() {
    document.body.classList.toggle("light-theme", state.theme === "light");
    $("#themeBtn").textContent = state.theme === "light" ? "☾" : "☼";
  }
  function setView(view) {
    currentView = view;
    $$(".view").forEach(el => el.classList.remove("active-view"));
    const targetView = ["today", "upcoming", "tasks"].includes(view) ? "tasks" : view;
    const target = $(`#${targetView}View`) || $("#dashboardView");
    target.classList.add("active-view");
    $$(".nav-item[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view || (view === "tasks" && ["today","upcoming"].includes(btn.dataset.view) && btn.dataset.view === currentView)));
    const labels = {dashboard:"Dashboard",today:"Today",upcoming:"Upcoming",tasks:"Tasks",calendar:"Calendar",habits:"Habits",focus:"Focus timer",settings:"Settings"};
    $("#pageCrumb").textContent = labels[view] || "Dashboard";
    $("#sidebar").classList.remove("open");
    if (view === "today" || view === "upcoming" || view === "tasks") renderTaskPage();
    if (view === "calendar") renderCalendar();
    if (view === "habits") renderHabits();
    if (view === "focus") renderFocusTasks();
  }
  function renderCategories() {
    const counts = Object.fromEntries(CATEGORIES.map(c => [c,state.tasks.filter(t=>t.category===c&&!t.completed).length]));
    $("#categoryNav").innerHTML = CATEGORIES.map((c,i)=>`<button class="category-link ${categoryFilter===c?"selected":""}" data-category="${c}"><i class="category-dot" style="--dot:${["#9c83ff","#65b9ff","#ffbc74","#54d9aa","#f18bb0"][i]}"></i>${c}<small>${counts[c]}</small></button>`).join("");
  }
  function priorityLabel(p) { return p[0].toUpperCase()+p.slice(1); }
  function taskMarkup(task, options={}) {
    const due = task.dueDate ? `${dateLabel(task.dueDate)}${task.dueTime ? ` · ${escapeHTML(task.dueTime)}` : ""}` : "";
    return `<article class="task-row ${task.completed?"is-completed":""} ${options.focusSelected?"focus-selected":""}" data-task-row="${escapeHTML(task.id)}" ${options.selectable?'tabindex="0" role="button" aria-label="Select task"':""}>
      <input class="task-check" type="checkbox" data-action="toggle" data-id="${escapeHTML(task.id)}" ${task.completed?"checked":""} aria-label="Mark ${escapeHTML(task.title)} completed">
      <div class="task-main"><span class="task-title">${escapeHTML(task.title)}</span>${task.description?`<p class="task-description">${escapeHTML(task.description)}</p>`:""}
        <div class="task-meta"><span class="priority-pill ${task.priority}">${priorityLabel(task.priority)}</span><span class="category-pill">${escapeHTML(task.category)}</span>${due?`<span class="due-pill ${isOverdue(task)?"overdue":""}">${isOverdue(task)?"⚠ ":"◷ "}${due}</span>`:""}</div>
      </div>
      ${options.hideActions?"":`<div class="task-actions"><button class="tiny-action" data-action="edit" data-id="${escapeHTML(task.id)}" aria-label="Edit task">✎</button><button class="tiny-action" data-action="delete" data-id="${escapeHTML(task.id)}" aria-label="Delete task">×</button></div>`}
    </article>`;
  }
  function taskById(id) { return state.tasks.find(t=>t.id===id); }
  function renderDashboard() {
    const tasks = state.tasks, completed = tasks.filter(t=>t.completed).length, pending = tasks.length-completed, overdue = tasks.filter(isOverdue).length;
    $("#totalStat").textContent = tasks.length; $("#completedStat").textContent = completed; $("#pendingStat").textContent = pending; $("#overdueStat").textContent = overdue;
    $("#todayCount").textContent = tasks.filter(t=>!t.completed&&t.dueDate===todayISO()).length;
    $("#streakValue").textContent = `${state.streak} day streak`;
    $("#completedCaption").textContent = tasks.length ? `${Math.round(completed/tasks.length*100)}% of all tasks` : "Your first win is waiting";
    const todayTasks = tasks.filter(t=>t.dueDate===todayISO()).sort(taskSort).slice(0,5);
    const doneToday = todayTasks.filter(t=>t.completed).length, pct = todayTasks.length ? Math.round(doneToday/todayTasks.length*100) : 0;
    $("#progressPercent").textContent = `${pct}%`; $("#progressRing").style.setProperty("--progress",`${pct*3.6}deg`); $("#progressBar").style.width=`${pct}%`;
    $("#progressHeadline").textContent = todayTasks.length ? (pct===100?"Day complete. Amazing work!":`${todayTasks.length-doneToday} task${todayTasks.length-doneToday===1?"":"s"} left to go.`) : "Your day is a blank canvas.";
    $("#progressText").textContent = todayTasks.length ? `${doneToday} of ${todayTasks.length} tasks completed today.` : "Add a task and get started.";
    $("#dashboardTaskList").innerHTML = todayTasks.map(t=>taskMarkup(t)).join("");
    $("#dashboardEmpty").hidden = todayTasks.length > 0;
    $("#dashboardTaskList").hidden = todayTasks.length === 0;
    renderChart(); renderHabitPreview(); renderCategories();
  }
  function taskSort(a,b) {
    const dateA = a.dueDate || "9999-12-31", dateB = b.dueDate || "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    if (a.dueTime !== b.dueTime) return (a.dueTime||"99:99").localeCompare(b.dueTime||"99:99");
    return new Date(b.createdAt)-new Date(a.createdAt);
  }
  function renderChart() {
    const days = [];
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;days.push({iso,label:d.toLocaleDateString(undefined,{weekday:"short"}),count:state.tasks.filter(t=>t.completed&&(t.completedAt||t.dueDate||t.createdAt.slice(0,10))===iso).length});}
    const max=Math.max(1,...days.map(d=>d.count));
    $("#weeklyChart").innerHTML=days.map(d=>`<div class="bar-column" title="${d.count} completed"><div class="bar-track"><div class="bar-fill" style="height:${Math.max(3,d.count/max*100)}%"></div></div><span class="bar-label">${d.label}</span></div>`).join("");
    $("#weeklyTotal").textContent=`${days.reduce((s,d)=>s+d.count,0)} completed`;
  }
  function renderHabitPreview() {
    const today=todayISO();
    $("#habitPreview").innerHTML = state.habits.slice(0,4).map(h=>{
      const done=Boolean(h.history[today]);
      const days=Object.values(h.history).filter(Boolean).length;
      return `<div class="habit-mini"><span class="habit-emoji">${escapeHTML(h.icon)}</span><div class="habit-mini-main"><strong>${escapeHTML(h.name)}</strong><div class="habit-mini-bar"><span style="width:${done?100:Math.min(90,days*10)}%"></span></div></div><span class="habit-mini-count">${done?"✓ Done":`${days} wins`}</span></div>`;
    }).join("") || `<p class="muted">Add a habit to start building a routine.</p>`;
  }
  function renderTaskPage() {
    const isToday=currentView==="today", isUpcoming=currentView==="upcoming";
    $("#tasksTitle").textContent = isToday?"Today's tasks":isUpcoming?"Upcoming tasks":categoryFilter?`${categoryFilter} tasks`:"All tasks";
    $("#tasksSubtitle").textContent = isToday?"A clear plan for the day.":isUpcoming?"What is coming up next.":"Organize your work, one task at a time.";
    let list=[...state.tasks];
    if(isToday) list=list.filter(t=>t.dueDate===todayISO());
    if(isUpcoming) list=list.filter(t=>t.dueDate>todayISO()&&!t.completed);
    if(categoryFilter) list=list.filter(t=>t.category===categoryFilter);
    if(searchQuery) list=list.filter(t=>`${t.title} ${t.description} ${t.category}`.toLowerCase().includes(searchQuery.toLowerCase()));
    const p=$("#priorityFilter").value;
    if(p!=="all")list=list.filter(t=>t.priority===p);
    list=list.filter(t=>currentFilter==="all"|| (currentFilter==="active"&&!t.completed)||(currentFilter==="completed"&&t.completed));
    const sort=$("#sortSelect").value;
    list.sort((a,b)=>sort==="priority"?PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority]||taskSort(a,b):sort==="created"?new Date(b.createdAt)-new Date(a.createdAt):sort==="title"?a.title.localeCompare(b.title):taskSort(a,b));
    $("#taskPageList").innerHTML=list.map(t=>taskMarkup(t)).join("");
    $("#taskPageEmpty").hidden=list.length>0; $("#taskPageList").hidden=list.length===0;
    $$(".filter-tab").forEach(btn=>btn.classList.toggle("selected",btn.dataset.filter===currentFilter));
    renderCategories();
  }
  function renderCalendar() {
    const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
    $("#calendarMonth").textContent=calendarCursor.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    const first=new Date(y,m,1), startOffset=(first.getDay()+6)%7, start=new Date(y,m,1-startOffset);
    const html=[];
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const dayTasks=state.tasks.filter(t=>t.dueDate===iso);
      html.push(`<button class="calendar-day ${d.getMonth()!==m?"outside":""} ${iso===todayISO()?"today":""} ${iso===selectedDate?"selected":""}" data-date="${iso}" aria-label="${iso}, ${dayTasks.length} tasks"><span class="day-number">${d.getDate()}</span><span class="day-dots">${dayTasks.slice(0,4).map(t=>`<i class="day-dot ${t.completed?"done":t.priority==="high"?"high":""}"></i>`).join("")}</span></button>`);
    }
    $("#calendarGrid").innerHTML=html.join("");
    $("#selectedDayTitle").textContent=new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
    const dayTasks=state.tasks.filter(t=>t.dueDate===selectedDate).sort(taskSort);
    $("#selectedDayTasks").innerHTML=dayTasks.map(t=>taskMarkup(t)).join("")||`<div class="empty-state"><strong>No tasks scheduled</strong><p>Enjoy the breathing room or add a task.</p></div>`;
  }
  function renderHabits() {
    const today=todayISO(), done=state.habits.filter(h=>h.history[today]).length, rate=state.habits.length?Math.round(done/state.habits.length*100):0;
    $("#habitCountStat").textContent=state.habits.length;$("#habitDoneStat").textContent=done;$("#habitRateStat").textContent=`${rate}%`;
    $("#habitsList").innerHTML=state.habits.map(h=>{
      const days=Object.keys(h.history).filter(d=>h.history[d]).sort();
      let streak=0, check=new Date();
      while(h.history[`${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`]){streak++;check.setDate(check.getDate()-1);}
      const recent=days.filter(d=>d>=(()=>{const x=new Date();x.setDate(x.getDate()-6);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;})()).length;
      return `<article class="habit-card"><div class="habit-card-top"><span class="habit-card-icon">${escapeHTML(h.icon)}</span><div><strong>${escapeHTML(h.name)}</strong><small>${streak} day streak · ${days.length} total wins</small></div><button class="habit-toggle ${h.history[today]?"done":""}" data-habit-toggle="${escapeHTML(h.id)}">${h.history[today]?"✓ Done today":"+ Mark done"}</button></div><div class="habit-card-progress"><span>Last 7 days</span><strong>${recent}/7</strong></div><div class="habit-card-bar"><span style="width:${recent/7*100}%"></span></div><div class="habit-card-footer"><span>${h.history[today]?"You've shown up today.":"Small steps count."}</span><button class="habit-delete" data-habit-delete="${escapeHTML(h.id)}" aria-label="Delete habit">Remove ×</button></div></article>`;
    }).join("") || `<div class="empty-state panel"><div class="empty-illustration">✳</div><strong>No habits yet</strong><p>Create a habit you want to practice consistently.</p><button class="primary-btn" id="emptyAddHabit">＋ New habit</button></div>`;
    renderHabitPreview();
  }
  function renderFocusTasks() {
    const list=state.tasks.filter(t=>!t.completed).sort(taskSort);
    if(!focusTaskId || !list.some(t=>t.id===focusTaskId)) focusTaskId=list[0]?.id||null;
    $("#focusTaskList").innerHTML=list.slice(0,8).map(t=>taskMarkup(t,{hideActions:true,selectable:true,focusSelected:t.id===focusTaskId})).join("");
    $("#focusEmpty").hidden=list.length>0;$("#focusTaskList").hidden=list.length===0;
    $("#sessionCount").textContent=`${sessionCount} focus session${sessionCount===1?"":"s"}`;
  }
  function openTaskModal(task=null, dueDate="") {
    $("#taskForm").reset();
    $("#taskId").value=task?.id||"";
    $("#modalTitle").textContent=task?"Edit task":"Create a task";
    $("#taskTitle").value=task?.title||"";
    $("#taskDescription").value=task?.description||"";
    $("#taskPriority").value=task?.priority||"medium";
    $("#taskCategory").value=task?.category|| (categoryFilter||"Personal");
    $("#taskDueDate").value=task?.dueDate||dueDate|| (currentView==="today"?todayISO():"");
    $("#taskDueTime").value=task?.dueTime||"";
    $("#taskModal").hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$("#taskTitle").focus(),30);
  }
  function closeTaskModal() {$("#taskModal").hidden=true;document.body.style.overflow="";}
  function createTask(title, priority="medium", dueDate="") {
    const clean=String(title||"").trim();
    if(!clean)return false;
    state.tasks.unshift({id:uid(),title:clean.slice(0,120),description:"",priority:["high","medium","low"].includes(priority)?priority:"medium",category:categoryFilter||"Personal",dueDate,dueTime:"",completed:false,createdAt:new Date().toISOString()});
    saveState();renderAll();return true;
  }
  function deleteTask(id) {
    const task=taskById(id);if(!task)return;
    if(!confirm(`Delete "${task.title}"? This cannot be undone.`))return;
    state.tasks=state.tasks.filter(t=>t.id!==id);if(focusTaskId===id)focusTaskId=null;
    saveState();renderAll();toast("Task deleted.");
  }
  function handleTaskAction(action,id,checked) {
    const task=taskById(id);if(!task)return;
    if(action==="toggle"){
      task.completed=Boolean(checked);task.completedAt=task.completed?todayISO():"";
      if(task.completed)toast("Task completed. Nice work!");else toast("Task moved back to in progress.");
    } else if(action==="edit") {openTaskModal(task);return;}
    else if(action==="delete"){deleteTask(id);return;}
    saveState();renderAll();
  }
  function renderAll() {
    applyTheme();renderDashboard();
    if(["today","upcoming","tasks"].includes(currentView))renderTaskPage();
    if(currentView==="calendar")renderCalendar();
    if(currentView==="habits")renderHabits();
    if(currentView==="focus")renderFocusTasks();
  }
  function exportData() {
    const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),format:"tasknova-backup-v1"},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`tasknova-backup-${todayISO()}.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Backup exported.");
  }
  function importData(file) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result));
        if(!data||!Array.isArray(data.tasks)||!Array.isArray(data.habits))throw new Error("This file doesn't look like a TaskNova backup.");
        if(!confirm(`Import ${data.tasks.length} tasks and ${data.habits.length} habits? Current data will be replaced.`))return;
        state={...state,tasks:data.tasks,habits:data.habits,theme:data.theme==="light"?"light":"dark"};
        // Re-run the same schema checks used for browser storage.
        localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state=loadState();saveState();renderAll();toast("Backup imported.");
      }catch(e){toast(e.message||"Could not import this file.","error");}
      $("#importInput").value="";
    };
    reader.onerror=()=>toast("Could not read that file.","error");
    reader.readAsText(file);
  }
  function openHabitModal(){ $("#habitForm").reset();$("#habitModal").hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$("#habitName").focus(),30); }
  function closeHabitModal(){ $("#habitModal").hidden=true;document.body.style.overflow=""; }
  function setTimerMode(minutes) {
    pauseTimer();timerDuration=minutes*60;timerRemaining=timerDuration;
    $$(".focus-mode").forEach(b=>b.classList.toggle("active",Number(b.dataset.minutes)===minutes));
    updateTimerUI();
  }
  function updateTimerUI() {
    const mins=Math.floor(timerRemaining/60),secs=timerRemaining%60;
    $("#timerDisplay").textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    const elapsed=timerDuration-timerRemaining,pct=timerDuration?elapsed/timerDuration:0;
    $("#timerRing").style.background=`conic-gradient(var(--purple) ${pct*360}deg,#2a2b3d ${pct*360}deg)`;
    $("#timerStatus").textContent=timerRunning?"FOCUS IN PROGRESS":timerRemaining===0?"SESSION COMPLETE":"READY TO FOCUS";
    $("#startTimer").innerHTML=timerRunning?"Ⅱ Pause":timerRemaining===0?"↻ Start again":"▶ Start focus";
  }
  function pauseTimer(){if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerRunning=false;updateTimerUI();}
  function startTimer(){
    if(timerRunning){pauseTimer();return;}
    if(timerRemaining<=0)timerRemaining=timerDuration;
    timerRunning=true;updateTimerUI();
    timerInterval=setInterval(()=>{
      timerRemaining--;
      if(timerRemaining<=0){timerRemaining=0;pauseTimer();sessionCount++;state.focusSessions=(state.focusSessions||0)+1;saveState();renderFocusTasks();toast("Session complete. Take a breath!");if("Notification"in window&&Notification.permission==="granted")new Notification("TaskNova",{body:"Your timer is complete. Great work!"});}
      updateTimerUI();
    },1000);
  }
  function renderGreeting(){
    const h=new Date().getHours();$("#greeting").innerHTML=`${h<12?"Good morning":h<18?"Good afternoon":"Good evening"}, let's make it count <span>✦</span>`;
    $("#dateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  }

  // Navigation
  $$(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>{categoryFilter="";currentFilter="all";setView(btn.dataset.view);renderAll();}));
  $$("[data-open-view]").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.openView)));
  $("#mobileMenuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#addCategoryBtn").addEventListener("click",()=>toast("Use the category field when creating a task. Built-in categories are ready."));
  $("#categoryNav").addEventListener("click",e=>{const btn=e.target.closest("[data-category]");if(!btn)return;categoryFilter=categoryFilter===btn.dataset.category?"":btn.dataset.category;currentFilter="all";setView("tasks");renderAll();});
  // Add/edit/delete tasks via delegated actions.
  document.addEventListener("click",e=>{
    const add=e.target.closest("[data-add-task]");if(add){openTaskModal();return;}
    const action=e.target.closest("[data-action]");
    if(action){handleTaskAction(action.dataset.action,action.dataset.id,action.checked);return;}
  });
  document.addEventListener("change",e=>{const el=e.target.closest('[data-action="toggle"]');if(el)handleTaskAction("toggle",el.dataset.id,el.checked);});
  $("#headerAddBtn").addEventListener("click",()=>openTaskModal());
  $("#welcomeAddBtn").addEventListener("click",()=>openTaskModal());
  $("#closeModal").addEventListener("click",closeTaskModal);$("#cancelModal").addEventListener("click",closeTaskModal);
  $("#taskModal").addEventListener("click",e=>{if(e.target===$("#taskModal"))closeTaskModal();});
  $("#taskForm").addEventListener("submit",e=>{
    e.preventDefault();const id=$("#taskId").value,title=$("#taskTitle").value.trim();
    if(!title){$("#taskTitle").focus();return;}
    const fields={title:title.slice(0,120),description:$("#taskDescription").value.trim().slice(0,600),priority:$("#taskPriority").value,category:$("#taskCategory").value,dueDate:$("#taskDueDate").value,dueTime:$("#taskDueTime").value};
    if(id){const t=taskById(id);if(t)Object.assign(t,fields);toast("Task updated.");}
    else{state.tasks.unshift({id:uid(),...fields,completed:false,createdAt:new Date().toISOString()});toast("Task created.");}
    saveState();closeTaskModal();renderAll();
  });
  $("#quickTaskForm").addEventListener("submit",e=>{e.preventDefault();if(createTask($("#quickTaskInput").value,$("#quickPriority").value,currentView==="today"?todayISO():"")){ $("#quickTaskInput").value="";toast("Task added to your list.");}});
  $("#searchInput").addEventListener("input",e=>{searchQuery=e.target.value;if(["today","upcoming","tasks"].includes(currentView))renderTaskPage();else if(searchQuery){setView("tasks");renderTaskPage();}});
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus();}if(e.key==="Escape"){closeTaskModal();closeHabitModal();$("#sidebar").classList.remove("open");}});
  $$(".filter-tab").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.filter;renderTaskPage();}));
  $("#priorityFilter").addEventListener("change",renderTaskPage);$("#sortSelect").addEventListener("change",renderTaskPage);
  // Calendar
  $("#prevMonth").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();});
  $("#nextMonth").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();});
  $("#todayMonth").addEventListener("click",()=>{calendarCursor=new Date();selectedDate=todayISO();renderCalendar();});
  $("#calendarGrid").addEventListener("click",e=>{const day=e.target.closest("[data-date]");if(!day)return;selectedDate=day.dataset.date;calendarCursor=new Date(`${selectedDate}T12:00:00`);renderCalendar();});
  $("#addSelectedDayTask").addEventListener("click",()=>openTaskModal(null,selectedDate));
  // Habits
  $("#addHabitBtn").addEventListener("click",openHabitModal);$("#closeHabitModal").addEventListener("click",closeHabitModal);$("#cancelHabitModal").addEventListener("click",closeHabitModal);
  $("#habitModal").addEventListener("click",e=>{if(e.target===$("#habitModal"))closeHabitModal();});
  $("#habitForm").addEventListener("submit",e=>{e.preventDefault();const name=$("#habitName").value.trim();if(!name)return;state.habits.push({id:uid(),name:name.slice(0,70),icon:$("#habitIcon").value,history:{}});saveState();closeHabitModal();renderAll();toast("Habit added.");});
  $("#habitsList").addEventListener("click",e=>{
    const toggle=e.target.closest("[data-habit-toggle]");if(toggle){const h=state.habits.find(x=>x.id===toggle.dataset.habitToggle);if(!h)return;const today=todayISO();if(h.history[today])delete h.history[today];else h.history[today]=true;saveState();renderHabits();renderDashboard();toast(h.history[today]?"Habit checked off!":"Habit unmarked.");return;}
    const del=e.target.closest("[data-habit-delete]");if(del){const h=state.habits.find(x=>x.id===del.dataset.habitDelete);if(h&&confirm(`Remove habit "${h.name}"?`)){state.habits=state.habits.filter(x=>x.id!==h.id);saveState();renderHabits();renderDashboard();toast("Habit removed.");}}
    if(e.target.closest("#emptyAddHabit"))openHabitModal();
  });
  // Focus timer
  $$(".focus-mode").forEach(btn=>btn.addEventListener("click",()=>setTimerMode(Number(btn.dataset.minutes))));
  $("#startTimer").addEventListener("click",startTimer);$("#resetTimer").addEventListener("click",()=>{pauseTimer();timerRemaining=timerDuration;updateTimerUI();});
  $("#skipTimer").addEventListener("click",()=>{pauseTimer();timerRemaining=0;updateTimerUI();toast("Timer skipped.");});
  $("#focusTaskList").addEventListener("click",e=>{const row=e.target.closest("[data-task-row]");if(!row||e.target.closest("button,input"))return;focusTaskId=row.dataset.taskRow;renderFocusTasks();});
  $("#focusTaskList").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-task-row]")){e.preventDefault();focusTaskId=e.target.dataset.taskRow;renderFocusTasks();}});
  // Settings, import/export, theme
  function toggleTheme(){state.theme=state.theme==="light"?"dark":"light";saveState();applyTheme();}
  $("#themeBtn").addEventListener("click",toggleTheme);$("#settingsThemeBtn").addEventListener("click",toggleTheme);
  $("#exportBtn").addEventListener("click",exportData);$("#settingsExportBtn").addEventListener("click",exportData);
  $("#importInput").addEventListener("change",e=>importData(e.target.files[0]));
  $("#resetDataBtn").addEventListener("click",()=>{if(confirm("Reset all TaskNova data in this browser? This cannot be undone.")){localStorage.removeItem(STORAGE_KEY);state=defaultState();saveState();renderAll();toast("App data reset.");}});
  // Request notifications only when the user chooses to start a focus timer.
  $("#startTimer").addEventListener("dblclick",()=>{if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();});

  markActiveDay();renderGreeting();renderAll();updateTimerUI();
})();
