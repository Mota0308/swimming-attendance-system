package com.swimming.attendance.ui.admin

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.swimming.attendance.R
import com.swimming.attendance.network.CloudAPIService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Calendar

class AdminMainActivity : AppCompatActivity() {
    private lateinit var tabAttendance: TextView
    private lateinit var tabConfig: TextView
    private lateinit var tabCoachMgmt: TextView

    private lateinit var attendanceSection: LinearLayout
    private lateinit var configSection: LinearLayout
    private lateinit var coachMgmtSection: LinearLayout

    // 教練管理
    private lateinit var dateText: TextView
    private lateinit var pickDateButton: Button
    private lateinit var uploadButton: Button
    private lateinit var coachList: LinearLayout
    private lateinit var coachSearchEdit: EditText
    private lateinit var coachSearchButton: Button

    private val coachHoursMap = mutableMapOf<String, MutableList<String>>() // phone -> ["HH:mm-HH:mm", ...]
    private val coachTotalHours = mutableMapOf<String, Double>()            // phone -> total hours
    private var allCoaches: List<CoachInfo> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_main)

        initViews()
        bindTabs()
        showSection("coach_mgmt")
        initCoachMgmt()
    }

    private fun initViews() {
        tabAttendance = findViewById(R.id.tabAttendance)
        tabConfig = findViewById(R.id.tabConfig)
        tabCoachMgmt = findViewById(R.id.tabCoachMgmt)

        attendanceSection = findViewById(R.id.sectionAttendance)
        configSection = findViewById(R.id.sectionConfig)
        coachMgmtSection = findViewById(R.id.sectionCoachMgmt)

        dateText = findViewById(R.id.selectedDateText)
        pickDateButton = findViewById(R.id.pickDateButton)
        uploadButton = findViewById(R.id.uploadWorkHoursButton)
        coachList = findViewById(R.id.coachListContainer)
        coachSearchEdit = findViewById(R.id.coachSearchEdit)
        coachSearchButton = findViewById(R.id.searchCoachButton)
    }

    private fun bindTabs() {
        tabAttendance.setOnClickListener { showSection("attendance") }
        tabConfig.setOnClickListener { showSection("config") }
        tabCoachMgmt.setOnClickListener { showSection("coach_mgmt") }
    }

    private fun showSection(key: String) {
        attendanceSection.visibility = if (key == "attendance") View.VISIBLE else View.GONE
        configSection.visibility = if (key == "config") View.VISIBLE else View.GONE
        coachMgmtSection.visibility = if (key == "coach_mgmt") View.VISIBLE else View.GONE

        tabAttendance.isSelected = key == "attendance"
        tabConfig.isSelected = key == "config"
        tabCoachMgmt.isSelected = key == "coach_mgmt"
    }

    private fun initCoachMgmt() {
        val cal = Calendar.getInstance()
        updateDateText(cal)

        pickDateButton.setOnClickListener {
            DatePickerDialog(this, { _, y, m, d ->
                cal.set(y, m, d)
                updateDateText(cal)
                // 日期切換不清除已編輯時段，僅影響上傳日期
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        coachSearchButton.setOnClickListener {
            renderCoachList(filter = coachSearchEdit.text?.toString()?.trim().orEmpty())
        }

        uploadButton.setOnClickListener {
            uploadWorkHours()
        }

        // 初次載入教練列表
        fetchCoaches()
    }

    private fun updateDateText(cal: Calendar) {
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        val d = cal.get(Calendar.DAY_OF_MONTH)
        dateText.text = String.format("%04d-%02d-%02d", y, m, d)
    }

    private fun fetchCoaches() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val api = CloudAPIService(this@AdminMainActivity)
                val resp = api.fetchCoaches()
                if (resp.success) {
                    val list = mutableListOf<CoachInfo>()
                    val data = resp.data?.toString() ?: "{}"
                    val obj = JSONObject(data)
                    val arr = obj.optJSONArray("coaches")
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val c = arr.getJSONObject(i)
                            list.add(CoachInfo(c.optString("studentName"), c.optString("phone")))
                        }
                    }
                    allCoaches = list
                    withContext(Dispatchers.Main) { renderCoachList() }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@AdminMainActivity, "無法獲取教練列表", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@AdminMainActivity, "獲取教練失敗: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun renderCoachList(filter: String = "") {
        coachList.removeAllViews()
        val coaches = if (filter.isNotEmpty()) {
            allCoaches.filter { it.name.contains(filter) }
        } else allCoaches

        for (coach in coaches) {
            addCoachRow(coach)
        }
    }

    private fun addCoachRow(coach: CoachInfo) {
        val row = layoutInflater.inflate(R.layout.item_coach_hours_row, coachList, false)
        val nameText = row.findViewById<TextView>(R.id.coachNameText)
        val totalText = row.findViewById<TextView>(R.id.totalHoursText)
        val addSlotButton = row.findViewById<Button>(R.id.addTimeSlotButton)
        val slotContainer = row.findViewById<LinearLayout>(R.id.timeSlotContainer)

        nameText.text = coach.name
        totalText.text = formatTotalHours(coachTotalHours[coach.phone] ?: 0.0)

        // 初始化本地狀態容器
        val list = coachHoursMap.getOrPut(coach.phone) { mutableListOf() }
        // 已有時段渲染
        for (slot in list) {
            addTimeSlotView(slotContainer, coach.phone, slot, totalText)
        }

        addSlotButton.setOnClickListener {
            addTimeSlotInput(slotContainer, coach.phone, totalText)
        }

        coachList.addView(row)
    }

    private fun addTimeSlotInput(container: LinearLayout, coachPhone: String, totalText: TextView) {
        val slotView = layoutInflater.inflate(R.layout.item_time_slot_input, container, false)
        val slotEdit = slotView.findViewById<EditText>(R.id.timeSlotEdit)
        val saveBtn = slotView.findViewById<Button>(R.id.saveSlotButton)
        val deleteBtn = slotView.findViewById<Button>(R.id.deleteSlotButton)

        saveBtn.setOnClickListener {
            val text = slotEdit.text?.toString()?.trim() ?: ""
            if (isValidSlot(text)) {
                val list = coachHoursMap.getOrPut(coachPhone) { mutableListOf() }
                list.add(text)
                recalcCoachTotal(coachPhone)
                totalText.text = formatTotalHours(coachTotalHours[coachPhone] ?: 0.0)
                // 將輸入框替換為顯示行
                val index = container.indexOfChild(slotView)
                container.removeViewAt(index)
                addTimeSlotView(container, coachPhone, text, totalText, index)
                Toast.makeText(this, "已保存時間段", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "請輸入格式為 HH:mm-HH:mm 且結束時間大於開始時間", Toast.LENGTH_SHORT).show()
            }
        }
        deleteBtn.setOnClickListener {
            container.removeView(slotView)
        }
        container.addView(slotView)
    }

    private fun addTimeSlotView(container: LinearLayout, coachPhone: String, value: String, totalText: TextView, atIndex: Int? = null) {
        val view = layoutInflater.inflate(R.layout.item_time_slot_input, container, false)
        val edit = view.findViewById<EditText>(R.id.timeSlotEdit)
        val save = view.findViewById<Button>(R.id.saveSlotButton)
        val del = view.findViewById<Button>(R.id.deleteSlotButton)

        // 顯示模式：禁用輸入，只提供編輯/刪除
        edit.setText(value)
        edit.isEnabled = false
        save.text = "編輯"

        save.setOnClickListener {
            if (!edit.isEnabled) {
                // 切換到可編輯
                edit.isEnabled = true
                save.text = "保存"
            } else {
                val text = edit.text?.toString()?.trim() ?: ""
                if (isValidSlot(text)) {
                    // 更新本地狀態
                    val list = coachHoursMap.getOrPut(coachPhone) { mutableListOf() }
                    val idx = list.indexOf(value)
                    if (idx >= 0) list[idx] = text
                    recalcCoachTotal(coachPhone)
                    totalText.text = formatTotalHours(coachTotalHours[coachPhone] ?: 0.0)
                    // 回到禁用狀態
                    edit.isEnabled = false
                    save.text = "編輯"
                    Toast.makeText(this, "已更新時間段", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "請輸入格式為 HH:mm-HH:mm 且結束時間大於開始時間", Toast.LENGTH_SHORT).show()
                }
            }
        }

        del.setOnClickListener {
            // 從本地狀態刪除並刷新合計
            val list = coachHoursMap.getOrPut(coachPhone) { mutableListOf() }
            list.remove(value)
            container.removeView(view)
            recalcCoachTotal(coachPhone)
            totalText.text = formatTotalHours(coachTotalHours[coachPhone] ?: 0.0)
            Toast.makeText(this, "已刪除時間段", Toast.LENGTH_SHORT).show()
        }

        if (atIndex != null) container.addView(view, atIndex) else container.addView(view)
    }

    private fun isValidSlot(text: String): Boolean {
        if (!text.matches(Regex("^\\d{2}:\\d{2}-\\d{2}:\\d{2}$"))) return false
        val parts = text.split("-")
        val (sh, sm) = parts[0].split(":").map { it.toInt() }
        val (eh, em) = parts[1].split(":").map { it.toInt() }
        return (eh * 60 + em) > (sh * 60 + sm)
    }

    private fun recalcCoachTotal(coachPhone: String) {
        val list = coachHoursMap[coachPhone] ?: emptyList()
        var sum = 0.0
        for (slot in list) {
            val parts = slot.split("-")
            val start = parts[0]
            val end = parts[1]
            sum += diffInHours(start, end)
        }
        coachTotalHours[coachPhone] = sum
    }

    private fun diffInHours(start: String, end: String): Double {
        val (sh, sm) = start.split(":").map { it.toInt() }
        val (eh, em) = end.split(":").map { it.toInt() }
        val minutes = (eh * 60 + em) - (sh * 60 + sm)
        return (minutes / 30.0) * 0.5 // 30分鐘=0.5 小時
    }

    private fun formatTotalHours(v: Double): String = String.format("%.1f", v)

    private fun uploadWorkHours() {
        val date = dateText.text.toString()
        val totals = coachTotalHours.toMap()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val api = CloudAPIService(this@AdminMainActivity)
                val resp = api.uploadCoachWorkHours(date, totals)
                withContext(Dispatchers.Main) {
                    if (resp.success) {
                        Toast.makeText(this@AdminMainActivity, "工時已上傳", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@AdminMainActivity, "上傳失敗: ${resp.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@AdminMainActivity, "上傳異常: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}

data class CoachInfo(val name: String, val phone: String) 