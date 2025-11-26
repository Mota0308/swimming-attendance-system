/**
 * Student_bill 數據遷移腳本
 * 為所有現有學生創建或更新 Student_bill 記錄
 * 基於 students_timeslot 計算統計數據
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

/**
 * 計算學生統計數據
 */
function calculateStudentStats(timeslots, todayString) {
  const stats = {
    purchasedClasses: 0,
    scheduledClasses: 0,
    attendedBooked: 0,
    absences: 0,
    leaveRequests: 0,
    bookedMakeup: 0,
    attendedMakeup: 0
  };
  
  timeslots.forEach(slot => {
    // 1. purchasedClasses: 總記錄數量
    stats.purchasedClasses++;
    
    // 2. scheduledClasses: classDate 有內容且 isLeave 為 false 的記錄數量
    if (slot.classDate && slot.classDate !== null && slot.classDate !== '' && slot.isLeave !== true) {
      stats.scheduledClasses++;
      
      // 3. attendedBooked: isAttended 為 true 的記錄數量
      if (slot.isAttended === true) {
        stats.attendedBooked++;
      }
      
      // 4. absences: classDate 為過去日期 && isAttended 為 false
      if (slot.classDate && typeof slot.classDate === 'string') {
        const classDateStr = slot.classDate.split('T')[0];
        if (classDateStr < todayString && slot.isAttended !== true) {
          stats.absences++;
        }
      }
    }
    
    // 5. leaveRequests: isLeave 為 true 的記錄數量
    if (slot.isLeave === true) {
      stats.leaveRequests++;
    }
    
    // 6. bookedMakeup: isChangeDate||isChangeTime||isChangeLocation 為 true 的記錄數量
    if (slot.isChangeDate === true || slot.isChangeTime === true || slot.isChangeLocation === true) {
      stats.bookedMakeup++;
      
      // 7. attendedMakeup: (isChangeDate||isChangeTime||isChangeLocation) && isAttended 為 true 的記錄數量
      if (slot.isAttended === true) {
        stats.attendedMakeup++;
      }
    }
  });
  
  return stats;
}

/**
 * 遷移 Student_bill 數據
 */
async function migrateStudentBill() {
  const client = new MongoClient(MONGO_BASE_URI);
  
  try {
    console.log('🔗 正在連接 MongoDB...');
    await client.connect();
    const db = client.db(DEFAULT_DB_NAME);
    console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}\n`);
    
    const studentAccountCollection = db.collection('Student_account');
    const timeslotCollection = db.collection('students_timeslot');
    const studentBillCollection = db.collection('Student_bill');
    
    // 獲取當前日期（用於判斷過去日期）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log('📊 開始遷移 Student_bill 數據...\n');
    
    // 獲取所有有 studentId 的學生
    const students = await studentAccountCollection.find({
      studentId: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📋 找到 ${students.length} 個有 studentId 的學生`);
    
    if (students.length === 0) {
      console.log('⚠️  沒有找到有 studentId 的學生，跳過遷移');
      return;
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // 為每個學生創建或更新 Student_bill 記錄
    for (const student of students) {
      try {
        const studentId = student.studentId;
        if (!studentId) {
          console.warn(`⚠️  跳過沒有 studentId 的學生: ${student.name || student.phone}`);
          continue;
        }
        
        // 獲取該學生的所有時段記錄
        const studentTimeslots = await timeslotCollection.find({
          studentId: studentId
        }).toArray();
        
        // 計算統計數據
        const stats = calculateStudentStats(studentTimeslots, todayString);
        
        // 檢查是否已存在記錄
        const existingBill = await studentBillCollection.findOne({ studentId: studentId });
        
        // 更新或創建 Student_bill 記錄
        const result = await studentBillCollection.updateOne(
          { studentId: studentId },
          {
            $set: {
              studentId: studentId,
              name: student.name || '',
              purchasedClasses: stats.purchasedClasses,
              scheduledClasses: stats.scheduledClasses,
              attendedBooked: stats.attendedBooked,
              absences: stats.absences,
              leaveRequests: stats.leaveRequests,
              bookedMakeup: stats.bookedMakeup,
              attendedMakeup: stats.attendedMakeup,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          createdCount++;
          console.log(`✅ 創建 Student_bill: studentId=${studentId}, name=${student.name || ''}, timeslots=${studentTimeslots.length}`);
        } else if (result.modifiedCount > 0) {
          updatedCount++;
          console.log(`🔄 更新 Student_bill: studentId=${studentId}, name=${student.name || ''}, timeslots=${studentTimeslots.length}`);
        }
        
        // 顯示前10個學生的詳細統計
        if (createdCount + updatedCount <= 10) {
          console.log(`   - purchasedClasses: ${stats.purchasedClasses}`);
          console.log(`   - scheduledClasses: ${stats.scheduledClasses}`);
          console.log(`   - attendedBooked: ${stats.attendedBooked}`);
          console.log(`   - absences: ${stats.absences}`);
          console.log(`   - leaveRequests: ${stats.leaveRequests}`);
          console.log(`   - bookedMakeup: ${stats.bookedMakeup}`);
          console.log(`   - attendedMakeup: ${stats.attendedMakeup}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 處理學生失敗 (studentId=${student.studentId}):`, error.message);
      }
    }
    
    console.log(`\n✅ 遷移完成！`);
    console.log(`   - 總學生數: ${students.length}`);
    console.log(`   - 創建記錄: ${createdCount}`);
    console.log(`   - 更新記錄: ${updatedCount}`);
    console.log(`   - 失敗: ${errorCount}`);
    
    // 驗證結果
    const totalBills = await studentBillCollection.countDocuments({});
    console.log(`\n📊 驗證結果:`);
    console.log(`   - Student_bill 總記錄數: ${totalBills}`);
    
    // 統計數據摘要
    const statsSummary = await studentBillCollection.aggregate([
      {
        $group: {
          _id: null,
          totalPurchased: { $sum: '$purchasedClasses' },
          totalScheduled: { $sum: '$scheduledClasses' },
          totalAttended: { $sum: '$attendedBooked' },
          totalAbsences: { $sum: '$absences' },
          totalLeaveRequests: { $sum: '$leaveRequests' },
          totalBookedMakeup: { $sum: '$bookedMakeup' },
          totalAttendedMakeup: { $sum: '$attendedMakeup' }
        }
      }
    ]).toArray();
    
    if (statsSummary.length > 0) {
      const summary = statsSummary[0];
      console.log(`\n📈 統計數據摘要:`);
      console.log(`   - 總已購堂數: ${summary.totalPurchased}`);
      console.log(`   - 總已定日子課堂: ${summary.totalScheduled}`);
      console.log(`   - 總已出席: ${summary.totalAttended}`);
      console.log(`   - 總缺席: ${summary.totalAbsences}`);
      console.log(`   - 總請假次數: ${summary.totalLeaveRequests}`);
      console.log(`   - 總已約補堂: ${summary.totalBookedMakeup}`);
      console.log(`   - 總補堂已出席: ${summary.totalAttendedMakeup}`);
    }
    
  } catch (error) {
    console.error('❌ 遷移腳本執行失敗:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB 連接已關閉');
    }
  }
}

// 執行遷移
if (require.main === module) {
  migrateStudentBill().catch(console.error);
}

module.exports = { migrateStudentBill };





























