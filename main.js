const { MongoClient } = require('mongodb');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

let mainWindow;

// 應用程序直接使用 MongoDB 雲端數據庫，無需本地後端服務器
function startBackendServer() {
  console.log('應用程序使用雲端 MongoDB 數據庫，無需本地後端服務器');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.svg'),
    title: '游泳課程出席管理系統',
    show: false
  });

  mainWindow.loadFile('index.html');
  
  // 直接顯示窗口
  mainWindow.show();

  // 開發模式下打開開發者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // 啟動後端服務器
  startBackendServer();
  
  // 創建主窗口
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 處理程序
ipcMain.handle('save-file', async (event, data) => {
  const { filePath, content } = data;
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    return { filePath, content };
  }
  return null;
});

ipcMain.handle('save-file-dialog', async (event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, content);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
}); 

ipcMain.handle('export-grouped-excel', async (event, ws_data, merges, filename) => {
    try {
        const { app } = require('electron');
        const desktopDir = app.getPath('desktop');
        const systemDir = path.join(desktopDir, 'System');
        if (!fs.existsSync(systemDir)) fs.mkdirSync(systemDir);
        let ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!merges'] = merges;
        // 設置每一列寬度為 40（約450像素）
        ws['!cols'] = Array(ws_data[0].length).fill({ wch: 40 });
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '分組出席表');
        const safeName = filename ? filename.replace(/[/\\:*?"<>|]/g, '_') : '分組出席表.xlsx';
        const filePath = path.join(systemDir, safeName);
        XLSX.writeFile(wb, filePath);
        return { success: true, filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
}); 

ipcMain.handle('export-exceljs', async (event, {header, data, filename}) => {
    try {
        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('Sheet1');
        worksheet.addRow(header);
        for (let i = 0; i < data.length; i++) {
            let row = worksheet.addRow(data[i]);
            // 對每一行，尋找每個學生姓名（非空且非重複），並在其右側第一個空白格設置資料驗證
            for (let c = 1; c <= row.cellCount; c++) {
                const val = row.getCell(c).value;
                // 判斷是否為學生姓名（非空字串且不是標題"學生"）
                if (typeof val === 'string' && val.trim() && val !== '學生') {
                    // 從該格右側開始尋找第一個空白格
                    for (let k = c + 1; k <= row.cellCount; k++) {
                        if (!row.getCell(k).value) {
                            worksheet.getCell(row.number, k).dataValidation = {
                                type: 'list',
                                allowBlank: true,
                                formulae: ['"➕,✅,❌,✅🎁✅,💪"'],
                                showDropDown: true
                            };
                            break;
                        }
                    }
                }
            }
        }
        worksheet.columns.forEach(col => { col.width = 15; });
        await workbook.xlsx.writeFile(filename);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}); 

function normalizeTimeStr(str) {
    return (str || '').toLowerCase().replace(/\s/g, '').replace(/am|pm/g, '');
}

function normalizeKeyPart(str) {
    return (str || '')
        .replace(/\s/g, '')
        .replace(/am|pm/gi, '')
        .replace(/[🎈🎁]/g, '')
        .replace(/：/g, ':')
        .replace(/（/g, '(').replace(/）/g, ')')
        .replace(/-/g, '-')
        .trim();
}

ipcMain.handle('export-exceljs-multisheet', async (event, {sheets, filename}) => {
    function parseStartTime(timeStr) {
        let match = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
        if (!match) return 0;
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    try {
        const fs = require('fs');
        let workbook = new ExcelJS.Workbook();
        if (fs.existsSync(filename)) {
            await workbook.xlsx.readFile(filename);
        }
        for (const sheet of sheets) {
            let worksheet = workbook.getWorksheet(sheet.name);
            if (!worksheet) {
                worksheet = workbook.addWorksheet(sheet.name);
                worksheet.addRow(sheet.header);
            }
            // 構建現有日期+時間索引
            let timeTypeMap = {};
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                let dateCell = row.values.find(v => typeof v === 'string' && /\d+月\d+日/.test(v));
                let timeCell = row.values.find(v => typeof v === 'string' && /\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(v));
                if (dateCell && timeCell) {
                    let key = `${normalizeKeyPart(dateCell)}|${normalizeKeyPart(timeCell)}`;
                    if (!timeTypeMap[key]) timeTypeMap[key] = { titleRow: rowNumber, lastStudentRow: rowNumber };
                }
            });
            // 收集所有新數據，按日期-時間-類型分組
            let groupMap = {};
            for (let i = 0; i < sheet.data.length; i++) {
                let rowData = sheet.data[i];
                let dateIdx = sheet.header.findIndex(h => /\d+月\d+日/.test(h));
                let timeIdx = sheet.data[i].findIndex(cell => /\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(cell));
                let typeIdx = sheet.data[i].findIndex(cell => typeof cell === 'string' && /[\u4e00-\u9fa5]+/.test(cell) && !/\d+月\d+日/.test(cell) && !/\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(cell));
                let nameIdx = sheet.data[i].findIndex(cell => cell && typeof cell === 'string' && cell.trim() && cell !== '學生' && !/\d+月\d+日/.test(cell) && !/\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(cell));
                let dateVal = dateIdx >= 0 ? rowData[dateIdx].replace('🎈', '') : null;
                let timeVal = timeIdx >= 0 ? rowData[timeIdx] : null;
                let typeVal = typeIdx >= 0 ? rowData[typeIdx] : null;
                let hasBalloon = rowData[dateIdx] && rowData[dateIdx].includes('🎈');
                let key = `${normalizeKeyPart(dateVal)}|${normalizeKeyPart(timeVal)}`;
                if (!groupMap[dateVal]) groupMap[dateVal] = [];
                groupMap[dateVal].push({
                    key,
                    rowData,
                    dateIdx,
                    timeIdx,
                    typeIdx,
                    nameIdx,
                    hasBalloon,
                    timeVal
                });
            }
            // 對每個日期下的時間段排序，然後依次插入
            let sortedDates = Object.keys(groupMap).sort((a, b) => {
                // 日期格式如 7月13日
                let am = a.match(/(\d{1,2})月(\d{1,2})日/);
                let bm = b.match(/(\d{1,2})月(\d{1,2})日/);
                if (!am || !bm) return 0;
                let ad = new Date(2000, parseInt(am[1], 10) - 1, parseInt(am[2], 10));
                let bd = new Date(2000, parseInt(bm[1], 10) - 1, parseInt(bm[2], 10));
                return ad - bd;
            });
            for (let date of sortedDates) {
                // 對該日期下的時間段排序
                let timeGroups = groupMap[date].sort((a, b) => parseStartTime(a.timeVal) - parseStartTime(b.timeVal));
                for (let entry of timeGroups) {
                    let { key, rowData, dateIdx, nameIdx, hasBalloon } = entry;
                    // 查找現有區塊
                    let insertRow = worksheet.rowCount + 1;
                    let isDuplicate = false;
                    if (timeTypeMap[key]) {
                        // 找到該區塊最後一個學生行
                        let lastRow = timeTypeMap[key].lastStudentRow;
                        // 檢查該區塊下是否已存在該學生
                        for (let r = timeTypeMap[key].titleRow + 1; r <= timeTypeMap[key].lastStudentRow; r++) {
                            let row = worksheet.getRow(r);
                            let studentCell = row.getCell(nameIdx + 1).value;
                            if (studentCell && studentCell.replace('🎈', '') === rowData[nameIdx].replace('🎈', '')) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        if (isDuplicate) continue; // 跳過重複學生
                        // 往下找直到遇到下一個時間段或空行
                        for (let r = lastRow + 1; r <= worksheet.rowCount; r++) {
                            let row = worksheet.getRow(r);
                            let isEmpty = row.values.slice(1).every(v => !v || v === '');
                            let isTimeTitle = row.values.some(v => typeof v === 'string' && /\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(v));
                            if (isTimeTitle || isEmpty) {
                                insertRow = r;
                                break;
                            }
                            timeTypeMap[key].lastStudentRow = r;
                        }
                        // 如果緊鄰下一個時間段，插入空行
                        if (insertRow === timeTypeMap[key].lastStudentRow + 1) {
                            worksheet.spliceRows(insertRow, 0, Array(worksheet.columnCount).fill(''));
                            insertRow++;
                        }
                    }
                    // 構建插入行
                    let processedData = [...rowData];
                    // 日期去除🎈
                    if (dateIdx >= 0) processedData[dateIdx] = processedData[dateIdx].replace('🎈', '');
                    // 學生姓名加🎈（只根據該日期）
                    if (nameIdx >= 0 && hasBalloon && !processedData[nameIdx].includes('🎈')) {
                        processedData[nameIdx] += '🎈';
                    }
                    worksheet.spliceRows(insertRow, 0, processedData);
                    // 更新索引
                    if (!timeTypeMap[key]) timeTypeMap[key] = { titleRow: insertRow, lastStudentRow: insertRow };
                    else timeTypeMap[key].lastStudentRow = insertRow;
                    // 資料驗證
                    let row = worksheet.getRow(insertRow);
                    for (let c = 1; c <= row.cellCount; c++) {
                        const val = row.getCell(c).value;
                        if (typeof val === 'string' && val.trim() && val !== '學生') {
                            let found = 0;
                            for (let k = c + 1; k <= row.cellCount && found < 3; k++) {
                                if (!row.getCell(k).value) {
                                    if (found === 0) {
                                        worksheet.getCell(row.number, k).dataValidation = {
                                            type: 'list',
                                            allowBlank: true,
                                            formulae: ['"➕,✅,❌,✅🎁✅,💪"'],
                                            showDropDown: true
                                        };
                                    } else if (found === 1) {
                                        worksheet.getCell(row.number, k).dataValidation = {
                                            type: 'list',
                                            allowBlank: true,
                                            formulae: ['"🌟補0.5堂,🌟補1堂,🌟補1.5堂,🔁補1堂,🔁補1.5堂"'],
                                            showDropDown: true
                                        };
                                    } else if (found === 2) {
                                        worksheet.getCell(row.number, k).dataValidation = {
                                            type: 'list',
                                            allowBlank: true,
                                            formulae: ['"✅,❌,➕"'],
                                            showDropDown: true
                                        };
                                    }
                                    found++;
                                }
                            }
                        }
                    }
                }
            }
            // 保持時間段間隔
            let lastTimeRow = 0;
            for (let r = 2; r <= worksheet.rowCount; r++) {
                let row = worksheet.getRow(r);
                let isTimeTitle = row.values.some(v => typeof v === 'string' && /\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?/.test(v));
                if (isTimeTitle) {
                    if (lastTimeRow > 0 && r - lastTimeRow > 1) {
                        let gap = r - lastTimeRow - 1;
                        if (gap < 2) {
                            worksheet.spliceRows(r, 0, Array(worksheet.columnCount).fill(''));
                        }
                    }
                    lastTimeRow = r;
                }
            }
            worksheet.columns.forEach(col => { col.width = 15; });
        }
        await workbook.xlsx.writeFile(filename);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}); 

const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // 用你的實際連接字串替換
const DB_NAME = 'test'; // 例如 'swimming'

const COLLECTION_NAME = 'students'; // 你想存的集合名

ipcMain.handle('import-students-to-cloud', async (event, grouped, allowCreate = true) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // 1. 取得所有現有學生（用於比對）
        const all = await collection.find({}).toArray();
        
        let matchedCount = 0;
        let modifiedCount = 0;
        let upsertedCount = 0;
        
        console.log(`操作模式: ${allowCreate ? '允許創建新文檔' : '僅更新現有文檔'}`);
        
        // 2. 處理每個學生
        for (const group of grouped) {
            console.log(`處理日期組: ${group.date}, 學生數量: ${group.students.length}`);
            for (const stu of group.students) {
                console.log(`處理學生: ${stu.name}, 日期: ${stu['上課日期']}`);
                
                // 找到雲端原始資料
                const dbStu = all.find(s => s.name === stu.name && s['上課日期'] === stu['上課日期']);
                
                if (dbStu) {
                    console.log(`找到雲端學生: ${dbStu.name}, 將進行更新`);
                    matchedCount++;
                    let updateFields = {};
                    // 只 set 有變動的欄位
                    for (const key of Object.keys(stu)) {
                        if (stu[key] !== dbStu[key]) {
                            updateFields[key] = stu[key];
                            console.log(`欄位 ${key} 有變動: ${dbStu[key]} -> ${stu[key]}`);
                        }
                    }
                    
                    // 只有變動欄位才更新
                    if (Object.keys(updateFields).length > 0) {
                        const result = await collection.updateOne(
                            { name: stu.name, "上課日期": stu["上課日期"] },
                            { $set: updateFields },
                            { upsert: false }
                        );
                        modifiedCount += result.modifiedCount;
                        console.log(`更新學生 ${stu.name} 的欄位:`, Object.keys(updateFields), `影響文檔數: ${result.modifiedCount}`);
                    } else {
                        console.log(`學生 ${stu.name} 沒有變動，跳過更新`);
                    }
                } else {
                    console.log(`學生 ${stu.name} 不存在於雲端`);
                    console.log(`雲端現有學生:`, all.map(s => `${s.name}(${s['上課日期']})`));
                    
                    // 無論是否允許創建，都嘗試創建新文檔（因為這可能是日期變更後的新記錄）
                    const result = await collection.insertOne(stu);
                    upsertedCount++;
                    console.log(`創建新學生 ${stu.name}, 插入ID: ${result.insertedId}`);
                }
            }
        }
        await client.close();
        return { 
            success: true, 
            message: '學生資料已成功處理',
            details: {
                matchedCount,
                modifiedCount,
                upsertedCount
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}); 

// 刪除雲端學生資料
ipcMain.handle('delete-student-from-cloud', async (event, { name, date }) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        console.log(`嘗試刪除學生: ${name}, 日期: ${date}`);
        
        // 刪除指定的學生資料
        const result = await collection.deleteOne({ 
            name: name, 
            "上課日期": date 
        });
        
        console.log(`刪除結果: 影響文檔數 ${result.deletedCount}`);
        
        await client.close();
        
        if (result.deletedCount > 0) {
            return { success: true, message: '學生資料已成功刪除' };
        } else {
            return { success: false, error: '找不到要刪除的學生資料' };
        }
    } catch (e) {
        console.error('刪除學生資料失敗:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('fetch-students-from-cloud', async (event) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        const all = await collection.find({}).toArray();
        // 分組
        const groupMap = {};
        all.forEach(stu => {
            const date = stu["上課日期"];
            if (!groupMap[date]) groupMap[date] = [];
            groupMap[date].push(stu);
        });
        const grouped = Object.keys(groupMap).map(date => ({
            date,
            students: groupMap[date]
        }));
        await client.close();
        return grouped;
    } catch (e) {
        return [];
    }
}); 

// 教練工時相關的IPC處理程序
ipcMain.handle('fetch-all-coaches', async (event) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_account');
        const coaches = await collection.find({}).toArray();
        await client.close();
        return coaches;
    } catch (e) {
        console.error('獲取教練列表失敗:', e);
        return [];
    }
});

// 創建新教練
ipcMain.handle('create-coach', async (event, { name, phone, password }) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const coachCollection = db.collection('Coach_account');
        const workHoursCollection = db.collection('Coach_work_hours');
        
        // 檢查教練是否已存在
        const existingCoach = await coachCollection.findOne({ phone: phone });
        if (existingCoach) {
            await client.close();
            return { success: false, error: '該電話號碼已存在' };
        }
        
        // 創建新教練
        const newCoach = {
            studentName: name,
            phone: phone,
            password: password,
            createdAt: new Date()
        };
        
        const result = await coachCollection.insertOne(newCoach);
        
        // 為新教練創建初始工時記錄（當前月份）
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        // 生成該月份的所有日期
        const daysInMonth = new Date(year, month, 0).getDate();
        const workHoursRecords = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            workHoursRecords.push({
                phone: phone,
                date: dateKey,
                hours: 0,
                createdAt: new Date()
            });
        }
        
        if (workHoursRecords.length > 0) {
            await workHoursCollection.insertMany(workHoursRecords);
        }
        
        await client.close();
        return { success: true, message: '教練創建成功' };
    } catch (e) {
        console.error('創建教練失敗:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('fetch-coach-work-hours', async (event, { phone, year, month }) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');
        
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        
        const workHours = await collection.find({
            phone: phone,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).toArray();
        
        const workHoursMap = {};
        workHours.forEach(record => {
            workHoursMap[record.date] = record.hours;
        });
        
        await client.close();
        return workHoursMap;
    } catch (e) {
        console.error('獲取教練工時失敗:', e);
        return {};
    }
});

ipcMain.handle('save-coach-work-hours', async (event, { phone, workHours }) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');
        
        const operations = [];
        Object.entries(workHours).forEach(([date, hours]) => {
            operations.push({
                updateOne: {
                    filter: { phone: phone, date: date },
                    update: { $set: { phone: phone, date: date, hours: hours, updatedAt: new Date() } },
                    upsert: true
                }
            });
        });
        
        if (operations.length > 0) {
            await collection.bulkWrite(operations);
        }
        
        await client.close();
        return { success: true };
    } catch (e) {
        console.error('保存教練工時失敗:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('export-coach-work-hours', async (event, { phone, year, month, coachName, exportPath }) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');
        
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        
        const workHours = await collection.find({
            phone: phone,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1 }).toArray();
        
        await client.close();
        
        // 生成Excel報表
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('教練工時報表');
        
        // 添加標題
        worksheet.addRow([`${coachName}${year}年${month}月份工時記錄表`]);
        worksheet.addRow([]);
        
        // 添加表頭
        worksheet.addRow(['日期', '星期', '工時(小時)', '備註']);
        
        // 添加數據
        let totalHours = 0;
        workHours.forEach(record => {
            const date = new Date(record.date);
            const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
            worksheet.addRow([record.date, `星期${weekday}`, record.hours, '']);
            totalHours += record.hours;
        });
        
        // 添加統計
        worksheet.addRow([]);
        worksheet.addRow(['總計', '', totalHours, '']);
        
        // 設置列寬
        worksheet.columns.forEach(col => { col.width = 15; });
        
        // 保存文件到指定路徑
        const filename = path.join(exportPath, `${coachName}${year}年${month}月份工時記錄表.xlsx`);
        await workbook.xlsx.writeFile(filename);
        
        return { success: true, filePath: filename };
    } catch (e) {
        console.error('導出教練工時報表失敗:', e);
        return { success: false, error: e.message };
    }
});

// 選擇導出目錄
ipcMain.handle('select-export-directory', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: '選擇保存報表的目錄'
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            return { success: true, path: result.filePaths[0] };
        } else {
            return { success: false, error: '未選擇目錄' };
        }
    } catch (e) {
        console.error('選擇導出目錄失敗:', e);
        return { success: false, error: e.message };
    }
}); 
