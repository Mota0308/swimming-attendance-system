import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var phone: String = ""
    @State private var name: String = ""
    @State private var password: String = ""
    @State private var userType: String = "coach"
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("登入資料")) {
                    Picker("角色", selection: $userType) {
                        Text("教練").tag("coach")
                        Text("家長").tag("parent")
                        Text("管理員").tag("admin")
                    }
                    TextField("電話", text: $phone)
                        .keyboardType(.numberPad)
                    SecureField("密碼", text: $password)
                    if userType == "coach" { TextField("姓名（可選）", text: $name) }
                }
                
                if let errorMessage = errorMessage, !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                }
                
                Button(action: login) {
                    if isLoading { ProgressView() } else { Text("登入") }
                }
                .disabled(isLoading || phone.isEmpty || password.isEmpty)
            }
            .navigationTitle("登入")
        }
    }
    
    private func login() {
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            do {
                let result = try await APIClient.shared.login(phone: phone, password: password, userType: userType)
                appState.userPhone = result.phone
                appState.userType = userType
                // 教練優先用後端姓名；家長/管理員則用後端 studentName（可能為空）
                appState.userName = !result.studentName.isEmpty ? result.studentName : (!name.isEmpty ? name : (userType == "coach" ? "教練" : ""))
                appState.isLoggedIn = true
            } catch { errorMessage = error.localizedDescription }
            isLoading = false
        }
    }
} 