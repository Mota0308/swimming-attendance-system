import SwiftUI

struct CoachDashboardView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedDate = Date()
    @State private var roster: [String: (time: String, location: String)] = [:]
    @State private var workHours: [String: Double] = [:]
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    // 新增：地點/泳會
    @State private var locations: [String] = []
    @State private var clubs: [String] = []
    @State private var selectedLocation: String = ""
    @State private var selectedClub: String = ""
    
    // 自動刷新
    @State private var timer: Timer?
    
    var body: some View {
        VStack(spacing: 12) {
            header
            filters
            actionBar
            if let errorMessage = errorMessage {
                Text(errorMessage).foregroundColor(.red)
            }
            calendarGrid
        }
        .padding()
        .onAppear { setup() }
        .onDisappear { timer?.invalidate(); timer = nil }
    }
    
    private var header: some View {
        HStack {
            DatePicker("月份", selection: $selectedDate, displayedComponents: .date)
                .datePickerStyle(.compact)
                .labelsHidden()
            Spacer()
            Button("刷新", action: fetchData)
                .disabled(isLoading)
        }
    }
    
    private var filters: some View {
        HStack {
            Menu {
                Picker("地點", selection: $selectedLocation) {
                    Text("全部地點").tag("")
                    ForEach(locations, id: \.self) { Text($0).tag($0) }
                }
            } label: {
                Text(selectedLocation.isEmpty ? "選擇地點" : selectedLocation)
            }
            .onChange(of: selectedLocation) { _ in
                Task { await loadClubsAndRefresh() }
            }
            
            Menu {
                Picker("泳會", selection: $selectedClub) {
                    Text("全部泳會").tag("")
                    ForEach(clubs, id: \.self) { Text($0).tag($0) }
                }
            } label: {
                Text(selectedClub.isEmpty ? "選擇泳會" : selectedClub)
            }
            .onChange(of: selectedClub) { _ in fetchData() }
            
            Spacer()
        }
    }
    
    private var actionBar: some View {
        HStack {
            NavigationLink(destination: RosterEditorView(month: selectedDate)) {
                Text("編輯更表")
            }
            NavigationLink(destination: WorkHoursEditorView(month: selectedDate)) {
                Text("編輯工時")
            }
            Spacer()
        }
    }
    
    private var calendarGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("更表（僅顯示有記錄日期）")
                .font(.headline)
            ForEach(roster.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                HStack {
                    Text(key)
                    Spacer()
                    Text(value.time)
                    Divider().frame(height: 14)
                    Text(value.location.isEmpty ? "無地點" : value.location)
                }
            }
            Divider().padding(.vertical, 8)
            Text("工時（僅顯示>0小時）").font(.headline)
            ForEach(workHours.sorted(by: { $0.key < $1.key }).filter { $0.value > 0 }, id: \.key) { key, value in
                HStack {
                    Text(key)
                    Spacer()
                    Text(String(format: "%.1f 小時", value))
                }
            }
        }
    }
    
    private func setup() {
        Task { @MainActor in
            do {
                self.locations = try await APIClient.shared.fetchLocations()
            } catch { self.errorMessage = error.localizedDescription }
            await loadClubsAndRefresh()
            startAutoRefresh()
        }
    }
    
    private func loadClubsAndRefresh() async {
        do {
            if !selectedLocation.isEmpty {
                self.clubs = try await APIClient.shared.fetchClubs(location: selectedLocation)
            } else {
                self.clubs = []
                self.selectedClub = ""
            }
        } catch { self.errorMessage = error.localizedDescription }
        fetchData()
    }
    
    private func startAutoRefresh() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
            fetchData()
        }
    }
    
    private func fetchData() {
        isLoading = true
        errorMessage = nil
        Task { @MainActor in
            do {
                let year = Calendar.current.component(.year, from: selectedDate)
                let month = Calendar.current.component(.month, from: selectedDate)
                self.roster = try await APIClient.shared.fetchCoachRoster(phone: appState.userPhone, name: appState.userName, year: year, month: month)
                self.workHours = try await APIClient.shared.fetchCoachWorkHours(phone: appState.userPhone, year: year, month: month, location: selectedLocation, club: selectedClub)
            } catch {
                self.errorMessage = error.localizedDescription
            }
            self.isLoading = false
        }
    }
} 