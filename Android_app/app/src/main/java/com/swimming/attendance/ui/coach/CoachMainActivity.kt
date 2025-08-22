package com.swimming.attendance.ui.coach

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.R
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.ui.login.LoginActivity
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Calendar

class CoachMainActivity : AppCompatActivity() {
    
    // UI組件
    private lateinit var userInfoText: TextView
    private lateinit var loadingProgressBar: ProgressBar
    private lateinit var refreshButton: ImageButton
    
    // 月份選擇與工時顯示
    private lateinit var monthSelect: Spinner
    private lateinit var monthSummaryText: TextView
    private lateinit var calendarGrid: GridLayout
    
    // 更表顯示
    private lateinit var rosterMonthSelect: Spinner
    private lateinit var rosterCalendarGrid: GridLayout
    
    // 地點和泳會選擇
    private lateinit var locationSelect: Spinner
    private lateinit var clubSelect: Spinner
    
    // 地點和泳會數據
    private var locations: MutableList<String> = mutableListOf()
    private var clubs: MutableList<String> = mutableListOf()
    private var selectedLocation: String = ""
    private var selectedClub: String = ""
    
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var apiConfig: APIConfig
    
    // 自動刷新相關變量
    private var autoRefreshHandler: Handler? = null
    private var autoRefreshRunnable: Runnable? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_coach_main)
        
        // 初始化API服務
        apiConfig = APIConfig.getInstance(this)
        cloudApiService = CloudAPIService(this)
        
        // 初始化UI組件
        initializeViews()
        
        // 設置用戶信息
        setupUserInfo()
        
        // 設置月份選擇與載入
        setupMonthLoader()
        
        // 設置刷新按鈕
        setupRefreshButton()
        
        Toast.makeText(this, "歡迎使用教練版本！", Toast.LENGTH_LONG).show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // 停止自動刷新
        stopAutoRefresh()
    }
    
    private fun initializeViews() {
        userInfoText = findViewById(R.id.userInfoText)
        loadingProgressBar = findViewById(R.id.loadingProgressBar)
        refreshButton = findViewById(R.id.refreshButton)
        
        monthSelect = findViewById(R.id.coachMonthSelect)
        monthSummaryText = findViewById(R.id.coachHoursSummaryText)
        calendarGrid = findViewById(R.id.coachHoursCalendarGrid)
        
        locationSelect = findViewById(R.id.coachLocationSelect)
        clubSelect = findViewById(R.id.coachClubSelect)
        
        // roster views
        rosterMonthSelect = findViewById(R.id.rosterMonthSelect)
        rosterCalendarGrid = findViewById(R.id.coachRosterCalendarGrid)
    }
    
    private fun setupUserInfo() {
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val currentPhone = prefs.getString("current_user_phone", "") ?: ""
        
        // 先顯示載入中的狀態
        userInfoText.text = "👤 當前用戶: 載入中... | 電話: $currentPhone"
        
        // 從資料庫獲取教練姓名
        fetchCoachInfo(currentPhone)
    }
    
    private fun fetchCoachInfo(phone: String) {
        if (phone.isEmpty()) {
            userInfoText.text = "👤 當前用戶: 未知教練 | 電話: 未知"
            return
        }
        
        lifecycleScope.launch {
            try {
                // 從API獲取教練信息
                val response = cloudApiService.fetchCoachInfo(phone)
                if (response.success) {
                    val coachData = response.data?.toString() ?: "{}"
                    val coachObj = JSONObject(coachData)
                    
                    // 修復：正確解析API響應結構
                    val coachName = if (coachObj.has("coach")) {
                        val coach = coachObj.getJSONObject("coach")
                        coach.optString("studentName", "未知教練")
                    } else {
                        coachObj.optString("studentName", "未知教練")
                    }
                    
                    runOnUiThread {
                        userInfoText.text = "👤 當前用戶: $coachName | 電話: $phone"
                    }
                } else {
                    // 如果獲取失敗，嘗試從教練列表中查找
                    val coachesResponse = cloudApiService.fetchCoaches()
                    if (coachesResponse.success) {
                        val coachesData = coachesResponse.data?.toString() ?: "{}"
                        val coachesObj = JSONObject(coachesData)
                        val coachesArray = coachesObj.optJSONArray("coaches")
                        
                        var foundCoachName = "教練"
                        if (coachesArray != null) {
                            for (i in 0 until coachesArray.length()) {
                                val coach = coachesArray.getJSONObject(i)
                                if (coach.optString("phone") == phone) {
                                    foundCoachName = coach.optString("studentName", "教練")
                                    break
                                }
                            }
                        }
                        
                        runOnUiThread {
                            userInfoText.text = "👤 當前用戶: $foundCoachName | 電話: $phone"
                        }
                    } else {
                        runOnUiThread {
                            userInfoText.text = "👤 當前用戶: 教練 | 電話: $phone"
                        }
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    userInfoText.text = "👤 當前用戶: 教練 | 電話: $phone"
                }
            }
        }
    }
    
    private fun setupMonthLoader() {
        // 初始化地點和泳會數據
        initializeLocationsAndClubs()
        
        val cal = Calendar.getInstance()
        val options = mutableListOf<String>()
        repeat(12) {
            val y = cal.get(Calendar.YEAR)
            val m = cal.get(Calendar.MONTH) + 1
            options.add(String.format("%04d-%02d", y, m))
            cal.add(Calendar.MONTH, -1)
        }
        monthSelect.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, options).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        
        // 設置月份選擇監聽器，自動觸發載入
        monthSelect.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                loadMonthlyHours()
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {
                // 不做任何處理
            }
        }
        
        // 設置地點選擇監聽器
        locationSelect.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedLocation = locations[position]
                // 當選擇地點時，載入對應的泳會
                loadClubsByLocation(selectedLocation)
                loadMonthlyHours()
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {
                selectedLocation = ""
            }
        }
        
        // 設置泳會選擇監聽器
        clubSelect.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedClub = clubs[position]
                loadMonthlyHours()
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {
                selectedClub = ""
            }
        }
        
        // 預設載入當月
        monthSelect.setSelection(0)
        loadMonthlyHours()
        
        // 初始化更表月份
        val rosterOptions = options.toList()
        rosterMonthSelect.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, rosterOptions).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        rosterMonthSelect.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                loadMonthlyRoster()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        rosterMonthSelect.setSelection(0)
        loadMonthlyRoster()
    }
    
    private fun initializeLocationsAndClubs() {
        // 初始化地點列表
        locations.clear()
        locations.add("全部地點")
        
        // 初始化泳會列表
        clubs.clear()
        clubs.add("全部泳會")
        
        // 設置地點下拉選單
        val locationAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, locations)
        locationAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        locationSelect.adapter = locationAdapter
        
        // 設置泳會下拉選單
        val clubAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, clubs)
        clubAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        clubSelect.adapter = clubAdapter
        
        // 預設選擇第一個選項
        locationSelect.setSelection(0)
        clubSelect.setSelection(0)
        selectedLocation = locations[0]
        selectedClub = clubs[0]
        
        // 從API獲取地點和泳會數據
        loadLocationsFromAPI()
    }
    
    private fun loadLocationsFromAPI() {
        lifecycleScope.launch {
            try {
                val response = cloudApiService.fetchAllLocations()
                if (response.success) {
                    val data = response.data?.toString() ?: "{}"
                    val jsonObj = JSONObject(data)
                    val locationsArray = jsonObj.optJSONArray("locations")
                    
                    if (locationsArray != null) {
                        val newLocations = mutableListOf<String>()
                        newLocations.add("全部地點")
                        
                        for (i in 0 until locationsArray.length()) {
                            val location = locationsArray.getString(i)
                            if (location.isNotEmpty()) {
                                newLocations.add(location)
                            }
                        }
                        
                        runOnUiThread {
                            locations.clear()
                            locations.addAll(newLocations)
                            val adapter = ArrayAdapter(this@CoachMainActivity, android.R.layout.simple_spinner_item, locations)
                            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                            locationSelect.adapter = adapter
                            locationSelect.setSelection(0)
                            selectedLocation = locations[0]
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("CoachMainActivity", "載入地點失敗", e)
            }
        }
    }
    
    private fun setupRefreshButton() {
        refreshButton.setOnClickListener {
            refreshAllData()
        }
        
        // 設置自動刷新機制，每30秒檢查一次工時記錄更新
        startAutoRefresh()
    }
    
    private fun startAutoRefresh() {
        val handler = Handler(Looper.getMainLooper())
        val autoRefreshRunnable = object : Runnable {
            override fun run() {
                // 只有在頁面可見時才自動刷新
                if (!isFinishing && !isDestroyed) {
                    Log.d("CoachMainActivity", "🔄 自動刷新工時記錄")
                    silentRefreshWorkHours()
                }
                // 30秒後再次執行
                handler.postDelayed(this, 30000)
            }
        }
        
        // 開始自動刷新
        handler.postDelayed(autoRefreshRunnable, 30000)
        
        // 保存引用以便停止
        this.autoRefreshHandler = handler
        this.autoRefreshRunnable = autoRefreshRunnable
    }
    
    private fun stopAutoRefresh() {
        autoRefreshHandler?.removeCallbacks(autoRefreshRunnable ?: return)
        autoRefreshHandler = null
        autoRefreshRunnable = null
    }
    
    private fun silentRefreshWorkHours() {
        val selected = monthSelect.selectedItem?.toString() ?: return
        val parts = selected.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val phone = prefs.getString("current_user_phone", "") ?: ""
        
        if (phone.isEmpty()) return
        
        lifecycleScope.launch {
            try {
                val resp = cloudApiService.fetchCoachMonthlyWorkHours(phone, year, month, selectedLocation, selectedClub)
                
                if (resp.success) {
                    val obj = JSONObject(resp.data?.toString() ?: "{}")
                    val arr = obj.optJSONArray("records")
                    var total = 0.0
                    val hoursMap = mutableMapOf<Int, Double>()
                    
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val item = arr.getJSONObject(i)
                            total += item.optDouble("hours", 0.0)
                            val dateStr = item.optString("date")
                            val day = try { dateStr.split("-")[2].toInt() } catch (_: Exception) { -1 }
                            if (day > 0) {
                                hoursMap[day] = item.optDouble("hours", 0.0)
                            }
                        }
                    }
                    
                    runOnUiThread {
                        monthSummaryText.text = "本月總時數: ${String.format("%.1f", total)}"
                        renderCalendar(year, month, hoursMap)
                        Log.d("CoachMainActivity", "✅ 自動刷新完成，載入${hoursMap.size}天工時")
                    }
                }
            } catch (e: Exception) {
                Log.e("CoachMainActivity", "❌ 自動刷新失敗", e)
            }
        }
    }
    
    private fun refreshAllData() {
        Log.d("CoachMainActivity", "🔄 開始刷新所有數據")
        Toast.makeText(this, "🔄 正在刷新數據...", Toast.LENGTH_SHORT).show()
        
        // 顯示載入動畫
        refreshButton.isEnabled = false
        refreshButton.alpha = 0.5f
        
        lifecycleScope.launch {
            try {
                // 1. 重新載入用戶信息
                val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val currentPhone = prefs.getString("current_user_phone", "") ?: ""
                fetchCoachInfo(currentPhone)
                
                // 2. 重新載入地點和泳會數據
                loadLocationsFromAPI()
                
                // 3. 重新載入工時數據
                loadMonthlyHours()
                
                // 4. 重新載入更表數據
                loadMonthlyRoster()
                
                runOnUiThread {
                    Toast.makeText(this@CoachMainActivity, "✅ 數據刷新完成", Toast.LENGTH_SHORT).show()
                    refreshButton.isEnabled = true
                    refreshButton.alpha = 1.0f
                }
                
            } catch (e: Exception) {
                Log.e("CoachMainActivity", "🔄 刷新數據失敗", e)
                runOnUiThread {
                    Toast.makeText(this@CoachMainActivity, "❌ 刷新失敗: ${e.message}", Toast.LENGTH_SHORT).show()
                    refreshButton.isEnabled = true
                    refreshButton.alpha = 1.0f
                }
            }
        }
    }
    
    private fun loadClubsByLocation(location: String) {
        Log.d("CoachMainActivity", "🏊‍♂️ 開始載入泳會 - 地點: $location")
        
        if (location == "全部地點") {
            // 如果選擇全部地點，顯示全部泳會
            Log.d("CoachMainActivity", "🏊‍♂️ 選擇全部地點，顯示全部泳會")
            runOnUiThread {
                clubs.clear()
                clubs.add("全部泳會")
                val adapter = ArrayAdapter(this@CoachMainActivity, android.R.layout.simple_spinner_item, clubs)
                adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                clubSelect.adapter = adapter
                clubSelect.setSelection(0)
                selectedClub = clubs[0]
                Toast.makeText(this@CoachMainActivity, "已載入全部泳會選項", Toast.LENGTH_SHORT).show()
            }
            return
        }
        
        lifecycleScope.launch {
            try {
                Log.d("CoachMainActivity", "🏊‍♂️ 調用API獲取泳會 - 地點: $location")
                val response = cloudApiService.fetchClubsByLocation(location)
                Log.d("CoachMainActivity", "🏊‍♂️ API響應: success=${response.success}, data=${response.data}")
                
                if (response.success) {
                    val data = response.data?.toString() ?: "{}"
                    val jsonObj = JSONObject(data)
                    val clubsArray = jsonObj.optJSONArray("clubs")
                    
                    Log.d("CoachMainActivity", "🏊‍♂️ 解析泳會數據: clubsArray=${clubsArray?.length() ?: 0}")
                    
                    if (clubsArray != null) {
                        val newClubs = mutableListOf<String>()
                        newClubs.add("全部泳會")
                        
                        for (i in 0 until clubsArray.length()) {
                            val club = clubsArray.getString(i)
                            if (club.isNotEmpty()) {
                                newClubs.add(club)
                                Log.d("CoachMainActivity", "🏊‍♂️ 添加泳會: $club")
                            }
                        }
                        
                        Log.d("CoachMainActivity", "🏊‍♂️ 總共載入 ${newClubs.size} 個泳會選項")
                        
                        runOnUiThread {
                            clubs.clear()
                            clubs.addAll(newClubs)
                            val adapter = ArrayAdapter(this@CoachMainActivity, android.R.layout.simple_spinner_item, clubs)
                            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                            clubSelect.adapter = adapter
                            clubSelect.setSelection(0)
                            selectedClub = clubs[0]
                            Toast.makeText(this@CoachMainActivity, "已載入 ${newClubs.size} 個泳會選項", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Log.w("CoachMainActivity", "🏊‍♂️ 泳會數據為空")
                        runOnUiThread {
                            Toast.makeText(this@CoachMainActivity, "該地點沒有泳會數據", Toast.LENGTH_SHORT).show()
                        }
                    }
                } else {
                    Log.e("CoachMainActivity", "🏊‍♂️ API調用失敗: ${response.message}")
                    runOnUiThread {
                        Toast.makeText(this@CoachMainActivity, "載入泳會失敗: ${response.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("CoachMainActivity", "🏊‍♂️ 載入泳會失敗", e)
                runOnUiThread {
                    Toast.makeText(this@CoachMainActivity, "載入泳會異常: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadMonthlyHours() {
        val selected = monthSelect.selectedItem?.toString() ?: return
        val parts = selected.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val phone = prefs.getString("current_user_phone", "") ?: ""
        if (phone.isEmpty()) {
            Toast.makeText(this, "找不到當前用戶電話", Toast.LENGTH_SHORT).show()
            return
        }
        
        // 添加調試信息
        Log.d("CoachMainActivity", "📊 載入工時 - 電話: $phone, 年份: $year, 月份: $month")
        Log.d("CoachMainActivity", "📊 選擇的地點: '$selectedLocation', 選擇的泳會: '$selectedClub'")
        
        lifecycleScope.launch {
            try {
                showLoading(true)
                val resp = cloudApiService.fetchCoachMonthlyWorkHours(phone, year, month, selectedLocation, selectedClub)
                showLoading(false)
                
                // 添加API響應調試
                Log.d("CoachMainActivity", "📊 API響應: success=${resp.success}, message=${resp.message}")
                Log.d("CoachMainActivity", "📊 API數據: ${resp.data}")
                if (resp.success) {
                    val obj = JSONObject(resp.data?.toString() ?: "{}")
                    val arr = obj.optJSONArray("records")
                    var total = 0.0
                    val hoursMap = mutableMapOf<Int, Double>() // day -> hours
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val item = arr.getJSONObject(i)
                            total += item.optDouble("hours", 0.0)
                            val dateStr = item.optString("date") // YYYY-MM-DD
                            val day = try { dateStr.split("-")[2].toInt() } catch (_: Exception) { -1 }
                            if (day > 0) {
                                hoursMap[day] = item.optDouble("hours", 0.0)
                            }
                        }
                    }
                    runOnUiThread {
                        monthSummaryText.text = "本月總時數: ${String.format("%.1f", total)}"
                        renderCalendar(year, month, hoursMap)
                        Toast.makeText(this@CoachMainActivity, "已載入${hoursMap.size}天工時", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    runOnUiThread {
                        monthSummaryText.text = "本月總時數: 0.0"
                        renderCalendar(year, month, emptyMap())
                        Toast.makeText(this@CoachMainActivity, "載入失敗: ${resp.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    showLoading(false)
                    monthSummaryText.text = "本月總時數: 0.0"
                    renderCalendar(year, month, emptyMap())
                    Toast.makeText(this@CoachMainActivity, "載入工時異常: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadMonthlyRoster() {
        val selected = rosterMonthSelect.selectedItem?.toString() ?: return
        val parts = selected.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val phone = prefs.getString("current_user_phone", "") ?: ""
        if (phone.isEmpty()) {
            Toast.makeText(this, "找不到當前用戶電話", Toast.LENGTH_SHORT).show(); return
        }
        
        // 從用戶信息文本中提取教練姓名，處理各種格式
        val userInfoText = userInfoText.text?.toString() ?: ""
        val coachName = when {
            userInfoText.contains("當前用戶: ") -> {
                val namePart = userInfoText.substringAfter("當前用戶: ").substringBefore(" | ")
                if (namePart.isNotBlank() && namePart != "載入中..." && namePart != "未知教練") namePart else "教練"
            }
            else -> "教練"
        }
        
        lifecycleScope.launch {
            try {
                showLoading(true)
                val resp = cloudApiService.fetchCoachMonthlyRoster(phone, coachName, year, month)
                showLoading(false)
                val data = mutableMapOf<Int, Pair<String, String>>() // day -> (time, location)
                if (resp.success) {
                    val obj = JSONObject(resp.data?.toString() ?: "{}")
                    val arr = obj.optJSONArray("records")
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val it = arr.getJSONObject(i)
                            val dateStr = it.optString("date")
                            val day = try { dateStr.split("-")[2].toInt() } catch (_: Exception) { -1 }
                            if (day > 0) data[day] = Pair(it.optString("time", ""), it.optString("location", ""))
                        }
                    }
                }
                runOnUiThread { 
                    renderRosterCalendar(year, month, data)
                    Toast.makeText(this@CoachMainActivity, "已載入${data.size}天更表", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    showLoading(false)
                    renderRosterCalendar(year, month, emptyMap())
                    Toast.makeText(this@CoachMainActivity, "載入更表異常: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun renderCalendar(year: Int, month: Int, hoursByDay: Map<Int, Double>) {
        calendarGrid.removeAllViews()
        
        // 明確設置GridLayout為7列
        calendarGrid.columnCount = 7
        calendarGrid.useDefaultMargins = false
        
        // 設置固定的格子寬度，確保7列都能顯示
        val cellWidth = 150 // 放大寬度，讓內容更清晰可見
        val cellHeight = 100 // 放大高度，讓內容更清晰可見
        
        // 添加星期標頭
        val weekdays = arrayOf("日", "一", "二", "三", "四", "五", "六")
        for (w in 0 until 7) {
            val headerText = TextView(this).apply {
                text = weekdays[w]
                setTextColor(0xFF1976D2.toInt())
                textSize = 14f // 恢復較大字體
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
                setBackgroundColor(0xFFE3F2FD.toInt())
                setPadding(4, 8, 4, 8) // 恢復適當內邊距
                layoutParams = GridLayout.LayoutParams().apply {
                    width = cellWidth
                    height = 50 // 恢復標頭高度
                    setMargins(1, 1, 1, 1)
                }
            }
            calendarGrid.addView(headerText)
        }
        
        val cal = Calendar.getInstance()
        cal.set(year, month - 1, 1)
        val startDow = cal.get(Calendar.DAY_OF_WEEK) // 1:Sunday
        val offset = startDow - Calendar.SUNDAY // 0..6
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        
        // 空白填充
        repeat(offset) {
            val empty = TextView(this).apply {
                text = ""
                setBackgroundColor(0xFFF5F5F5.toInt())
                layoutParams = GridLayout.LayoutParams().apply {
                    width = cellWidth
                    height = cellHeight
                    setMargins(1, 1, 1, 1)
                }
            }
            calendarGrid.addView(empty)
        }
        
        // 當天
        val todayCal = Calendar.getInstance()
        val isSameMonth = (todayCal.get(Calendar.YEAR) == year && (todayCal.get(Calendar.MONTH) + 1) == month)
        val todayDay = if (isSameMonth) todayCal.get(Calendar.DAY_OF_MONTH) else -1
        
        // 生成每日格
        for (day in 1..daysInMonth) {
            val hours = hoursByDay[day] ?: 0.0
            
            val dayText = TextView(this).apply {
                text = if (hours > 0) "$day\n${String.format("%.1f", hours)}" else day.toString()
                setTextColor(0xFF333333.toInt())
                textSize = 12f // 恢復適當字體大小
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
                setBackgroundColor(0xFFFFFFFF.toInt())
                setPadding(2, 4, 2, 4) // 恢復適當內邊距
                layoutParams = GridLayout.LayoutParams().apply {
                    width = cellWidth
                    height = cellHeight
                    setMargins(1, 1, 1, 1)
                }
            }
            
            // 今日高亮
            if (day == todayDay) {
                dayText.setBackgroundColor(0xFFFFF3CD.toInt())
                dayText.setTextColor(0xFFE65100.toInt())
            }
            
            // 如果有工時，設置綠色文字
            if (hours > 0) {
                dayText.setTextColor(0xFF4CAF50.toInt())
            }
            
            dayText.setOnClickListener {
                val msg = if (hours > 0) 
                    "${year}-${String.format("%02d", month)}-${String.format("%02d", day)}：${String.format("%.1f", hours)} 小時" 
                else 
                    "${year}-${String.format("%02d", month)}-${String.format("%02d", day)}：無記錄"
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
            }
            
            calendarGrid.addView(dayText)
        }
    }
    
    private fun renderRosterCalendar(year: Int, month: Int, rosterByDay: Map<Int, Pair<String, String>>) {
        rosterCalendarGrid.removeAllViews()
        rosterCalendarGrid.columnCount = 7
        val cellWidth = 220  // 進一步增加寬度
        val cellHeight = 160 // 進一步增加高度
        val weekdays = arrayOf("日", "一", "二", "三", "四", "五", "六")
        
        // 添加星期標頭
        for (w in 0 until 7) {
            val header = TextView(this).apply {
                text = weekdays[w]
                setTextColor(0xFF17A2B8.toInt())
                textSize = 16f  // 增加標頭字體大小
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
                setBackgroundColor(0xFFE3F2FD.toInt())
                setPadding(8, 12, 8, 12)  // 增加內邊距
                layoutParams = GridLayout.LayoutParams().apply { 
                    width = cellWidth; 
                    height = 60;  // 增加標頭高度
                    setMargins(2, 2, 2, 2) 
                }
            }
            rosterCalendarGrid.addView(header)
        }
        
        val cal = Calendar.getInstance().apply { 
            set(year, month - 1, 1); 
            val firstDay = get(Calendar.DAY_OF_WEEK) - 1; 
            add(Calendar.DAY_OF_MONTH, -firstDay) 
        }
        
        for (i in 0 until 42) {
            val dayOfMonth = cal.get(Calendar.DAY_OF_MONTH)
            val isCurrentMonth = cal.get(Calendar.MONTH) == (month - 1)
            val info = rosterByDay[if (isCurrentMonth) dayOfMonth else -1]
            val timeText = info?.first ?: ""
            val locText = info?.second ?: ""
            
            val cell = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundColor(0xFFFFFFFF.toInt())
                layoutParams = GridLayout.LayoutParams().apply { 
                    width = cellWidth; 
                    height = cellHeight; 
                    setMargins(2, 2, 2, 2)  // 增加邊距
                }
                setPadding(12, 12, 12, 12)  // 進一步增加內邊距
            }
            
            // 日期標籤
            val dayLabel = TextView(this).apply {
                text = dayOfMonth.toString()
                setTextColor(if (isCurrentMonth) 0xFF333333.toInt() else 0xFF999999.toInt())
                textSize = 11f  // 調小日期字體大小
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = 6
                }
            }
            
            // 時間標籤
            val timeLabel = TextView(this).apply {
                text = if (timeText.isNotEmpty()) timeText else "無更表"
                setTextColor(if (timeText.isNotEmpty()) 0xFF00796B.toInt() else 0xFF999999.toInt())
                textSize = 12f  // 調小時間字體大小
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = 4
                }
            }
            
            // 地點標籤
            val locLabel = TextView(this).apply {
                text = if (locText.isNotEmpty()) locText else "無地點"
                setTextColor(if (locText.isNotEmpty()) 0xFF6C757D.toInt() else 0xFF999999.toInt())
                textSize = 10f  // 調小地點字體大小
                gravity = Gravity.CENTER
                maxLines = 2  // 允許兩行顯示
                ellipsize = android.text.TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // 如果有更表數據，設置背景色
            if (timeText.isNotEmpty() || locText.isNotEmpty()) {
                cell.setBackgroundColor(0xFFE8F5E8.toInt())  // 淺綠色背景
            }
            
            cell.addView(dayLabel)
            cell.addView(timeLabel)
            cell.addView(locLabel)
            
            // 添加點擊事件顯示詳細信息
            cell.setOnClickListener {
                val msg = if (timeText.isNotEmpty() || locText.isNotEmpty()) {
                    "${year}-${String.format("%02d", month)}-${String.format("%02d", dayOfMonth)}\n時間: $timeText\n地點: $locText"
                } else {
                    "${year}-${String.format("%02d", month)}-${String.format("%02d", dayOfMonth)}：無更表"
                }
                Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
            }
            
            rosterCalendarGrid.addView(cell)
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
    }
    
    private fun showLoading(show: Boolean) {
        loadingProgressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    override fun onBackPressed() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)
        finish()
    }
} 