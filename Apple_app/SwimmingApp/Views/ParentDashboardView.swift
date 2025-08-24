import SwiftUI

struct ParentDashboardView: View {
    @EnvironmentObject var appState: AppState
    @State private var students: [APIClient.Student] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            List {
                if let err = errorMessage { Text(err).foregroundColor(.red) }
                Section(header: Text("我的學生")) {
                    ForEach(students) { s in
                        VStack(alignment: .leading) {
                            Text(s.name).font(.headline)
                            Text("電話: \(s.phone)")
                            if !s.location.isEmpty { Text("地點: \(s.location)") }
                            if !s.club.isEmpty { Text("泳會: \(s.club)") }
                        }
                    }
                }
            }
            .navigationTitle("家長首頁")
            .onAppear { fetch() }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("刷新", action: fetch)
                        .disabled(isLoading)
                }
            }
        }
    }
    
    private func fetch() {
        isLoading = true
        errorMessage = nil
        Task { @MainActor in
            do { students = try await APIClient.shared.fetchStudentsByUser(phone: appState.userPhone) }
            catch { errorMessage = error.localizedDescription }
            isLoading = false
        }
    }
} 