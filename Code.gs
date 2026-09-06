const CONFIG = {
  spreadsheetId: '1YMQPGC8pWdukQ1sQJ7XDHRPQA3fa2GeSC57ue-tImuU',
  studentsSheet: 'CATEQUIZANDOS',
  attendanceSheet: 'QR ASISTENCIA',
  cycleStart: '2026-08-31',
  specialEvents: [
    ['2026-11-01','Todos los Santos','😇','Misa solemne'],
    ['2026-11-22','Jesucristo Rey del Universo','👑','Misa solemne'],
    ['2026-11-29','Primer Domingo de Adviento','🕯️','Celebración especial'],
    ['2026-12-08','Inmaculada Concepción','💙','Misa solemne'],
    ['2026-12-12','Nuestra Señora de Guadalupe','🌹','Misa solemne'],
    ['2026-12-25','Natividad del Señor','👶','Misa solemne'],
    ['2027-01-01','Santa María, Madre de Dios','👸','Misa solemne'],
    ['2027-01-06','Epifanía del Señor','⭐','Misa solemne'],
    ['2027-02-10','Miércoles de Ceniza','✝️','Celebración especial'],
    ['2027-03-19','San José','🪚','Misa solemne'],
    ['2027-03-21','Domingo de Ramos','🌿','Celebración especial'],
    ['2027-03-25','Jueves Santo','🍞','Misa solemne'],
    ['2027-03-26','Viernes Santo · Pasión del Señor','✝️','Celebración de la Pasión'],
    ['2027-03-27','Solemne Vigilia Pascual','🔥','Misa solemne'],
    ['2027-03-28','Domingo de Resurrección','☀️','Misa solemne'],
    ['2027-05-06','Ascensión del Señor','☁️','Misa solemne'],
    ['2027-05-16','Pentecostés','🕊️','Misa solemne'],
    ['2027-05-23','Santísima Trinidad','🔺','Misa solemne'],
    ['2027-05-27','Corpus Christi','🕯️','Misa solemne'],
    ['2027-06-04','Sagrado Corazón de Jesús','❤️‍🔥','Misa solemne'],
    ['2027-06-29','Santos Pedro y Pablo','🔑','Misa solemne']
  ]
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'report') return apiResponse_(e);
  return HtmlService.createHtmlOutput('API CATEKIDS activa');
}

function apiResponse_(e) {
  const cb = String(e.parameter.callback || 'catekidsCallback').replace(/[^a-zA-Z0-9_.$]/g, '');
  let payload;
  try { payload = {ok:true, data:getReport(e.parameter.code || '')}; }
  catch (err) { payload = {ok:false, error:err.message || String(err)}; }
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getReport(scannedCode) {
  const code = key_(scannedCode);
  if (!code) throw new Error('El QR no contiene un código válido.');
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const students = ss.getSheetByName(CONFIG.studentsSheet).getDataRange().getDisplayValues();
  const sh = headerMap_(students[0]);
  const student = students.slice(1).find(r => key_(r[sh['CODIGO']]) === code);
  if (!student) throw new Error('No encontramos este código en CATEQUIZANDOS.');
  const attendance = ss.getSheetByName(CONFIG.attendanceSheet).getDataRange().getDisplayValues();
  const ah = headerMap_(attendance[0]);
  const own = attendance.slice(1).filter(r => key_(r[ah['CODIGO']]) === code);
  const tz = ss.getSpreadsheetTimeZone() || 'America/Mexico_City';
  const today = todayInTz_(tz), start = parseIso_(CONFIG.cycleStart);
  const rowDate = r => parseSheetDate_(r[ah['FECHA']]);
  const incidence = r => norm_(r[ah['INCIDENCIA']]);

  const weekendEnd = new Date(today);
  if (today.getDay() === 6) weekendEnd.setDate(weekendEnd.getDate() + 1);
  const sundays = weekdayDates_(start, weekendEnd, 0);
  const sundayEvents = sundays.map(date => {
    const saturday = addDays_(date, -1);
    const yes = own.some(r => incidence(r).includes('MISA DOMINICAL') &&
      (sameDay_(rowDate(r), saturday) || sameDay_(rowDate(r), date)));
    return event_(date, 'Misa dominical', '⛪', yes ? 'asistio' : (date >= today ? 'pendiente' : 'falta'));
  });

  const hourEvents = monthKeys_(start, today).map(month => {
    const rows = own.filter(r => {
      const d = rowDate(r);
      return d && monthKey_(d) === month && incidence(r).includes('HORA SANTA');
    });
    const monthEnd = endOfMonth_(parseIso_(month + '-01'));
    // La Hora Santa es un compromiso mensual de acompañamiento. Si aún no existe
    // registro, permanece como pendiente y no se contabiliza como falta.
    const state = rows.length ? 'asistio' : 'pendiente';
    const badgeDate = rows.length ? rowDate(rows[0]) : lastWeekday_(monthEnd, 4);
    return event_(badgeDate, 'Hora Santa mensual', '🙏', state);
  });

  const specialEvents = CONFIG.specialEvents.map(item => {
    const date = parseIso_(item[0]);
    const yes = own.some(r => sameDay_(rowDate(r), date));
    const state = yes ? 'asistio' : (date > today ? 'proximo' : (sameDay_(date,today) ? 'pendiente' : 'falta'));
    return {...event_(date, item[1], item[2], state), clase:item[3]};
  });

  const dueSpecial = specialEvents.filter(x => x.estado !== 'proximo');
  const categories = [summary_('Misa dominical', sundayEvents), summary_('Hora Santa · 1 al mes', hourEvents), summary_('Celebraciones especiales', dueSpecial)];
  const counted = categories.reduce((n,c) => n + c.asistencias + c.faltas, 0);
  const yes = categories.reduce((n,c) => n + c.asistencias, 0);
  return {
    nombre: student[sh['NOMBRE DEL ALUMNO']] || '', curso: student[sh['CURSO']] || '',
    grupo: student[sh['CODIGO DE GRUPO']] || '', catequista: student[sh['CATEQUISTA']] || '',
    santo: student[sh['SANTO DE GRUPO']] || '', asistencias:yes,
    faltas:categories.reduce((n,c)=>n+c.faltas,0), pendientes:categories.reduce((n,c)=>n+c.pendientes,0),
    porcentaje:counted ? Math.round(yes*1000/counted)/10 : 0,
    categorias:categories,
    calendario:sundayEvents.concat(hourEvents).concat(specialEvents).sort((a,b)=>a.iso.localeCompare(b.iso)),
    insignias:specialEvents, hoy:dateKey_(today), actualizado:Utilities.formatDate(new Date(),tz,'dd/MM/yyyy HH:mm')
  };
}

function event_(date,tipo,icono,estado){return{iso:dateKey_(date),tipo,icono,estado}}
function summary_(tipo,events){return{tipo,programadas:events.length,asistencias:events.filter(x=>x.estado==='asistio').length,faltas:events.filter(x=>x.estado==='falta').length,pendientes:events.filter(x=>x.estado==='pendiente').length}}
function headerMap_(r){return r.reduce((m,v,i)=>(m[norm_(v)]=i,m),{})}
function key_(v){return norm_(v).replace(/[^A-Z0-9]/g,'')}
function norm_(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
function parseIso_(s){const p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function parseSheetDate_(s){const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?new Date(+m[3],+m[2]-1,+m[1]):null}
function todayInTz_(tz){return parseIso_(Utilities.formatDate(new Date(),tz,'yyyy-MM-dd'))}
function dateKey_(d){return d?Utilities.formatDate(d,'America/Mexico_City','yyyy-MM-dd'):''}
function sameDay_(a,b){return a&&b&&dateKey_(a)===dateKey_(b)}
function addDays_(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function monthKey_(d){return Utilities.formatDate(d,'America/Mexico_City','yyyy-MM')}
function monthKeys_(start,end){const out=[],d=new Date(start.getFullYear(),start.getMonth(),1),last=new Date(end.getFullYear(),end.getMonth(),1);while(d<=last){out.push(monthKey_(d));d.setMonth(d.getMonth()+1)}return out}
function endOfMonth_(d){return new Date(d.getFullYear(),d.getMonth()+1,0)}
function lastWeekday_(d,weekday){const x=new Date(d);while(x.getDay()!==weekday)x.setDate(x.getDate()-1);return x}
function weekdayDates_(start,end,w){const out=[],d=new Date(start);while(d.getDay()!==w)d.setDate(d.getDate()+1);while(d<=end){out.push(new Date(d));d.setDate(d.getDate()+7)}return out}
