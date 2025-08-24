import Foundation

struct APIError: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

final class APIClient {
    static let shared = APIClient()
    private let session: URLSession
    private let baseURL: URL
    private let publicKey: String
    private let privateKey: String
    
    private init() {
        session = URLSession(configuration: .default)
        let cfg = APIClient.loadConfig()
        baseURL = cfg.baseURL
        publicKey = cfg.publicKey
        privateKey = cfg.privateKey
    }
    
    private static func loadConfig() -> (baseURL: URL, publicKey: String, privateKey: String) {
        guard let url = Bundle.main.url(forResource: "Config", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            return (URL(string: "https://swimming-attendance-system-production.up.railway.app")!, "", "")
        }
        let base = (dict["BaseURL"] as? String) ?? "https://swimming-attendance-system-production.up.railway.app"
        let pub = (dict["PublicApiKey"] as? String) ?? ""
        let pri = (dict["PrivateApiKey"] as? String) ?? ""
        return (URL(string: base)!, pub, pri)
    }
    
    private func makeRequest(path: String, query: [String: String]) throws -> URLRequest {
        var comps = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = comps.url else { throw APIError(message: "Invalid URL") }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(publicKey, forHTTPHeaderField: "X-API-Public-Key")
        req.setValue(privateKey, forHTTPHeaderField: "X-API-Private-Key")
        return req
    }
    
    private func makePost(path: String, body: [String: Any]) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(publicKey, forHTTPHeaderField: "X-API-Public-Key")
        req.setValue(privateKey, forHTTPHeaderField: "X-API-Private-Key")
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        return req
    }
    
    // MARK: Students
    struct Student: Identifiable { let id: String; let name: String; let phone: String; let club: String; let location: String }
    
    func fetchStudentsByUser(phone: String) async throws -> [Student] {
        let req = try makeRequest(path: "/students/user/\(phone)", query: [:])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw APIError(message: "Students HTTP error") }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let success = json?["success"] as? Bool, success else { throw APIError(message: "Students API failed") }
        var result: [Student] = []
        if let arr = json?["students"] as? [[String: Any]] {
            for s in arr {
                let id = (s["_id"] as? String) ?? UUID().uuidString
                let name = (s["name"] as? String) ?? (s["studentName"] as? String) ?? ""
                let phone = (s["phone"] as? String) ?? (s["studentPhone"] as? String) ?? ""
                let club = (s["club"] as? String) ?? ""
                let location = (s["location"] as? String) ?? ""
                result.append(Student(id: id, name: name, phone: phone, club: club, location: location))
            }
        }
        return result
    }
    
    func fetchAllStudents() async throws -> [Student] {
        let req = try makeRequest(path: "/students", query: [:])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw APIError(message: "Students HTTP error") }
        let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
        var result: [Student] = []
        for s in arr {
            let id = (s["_id"] as? String) ?? UUID().uuidString
            let name = (s["name"] as? String) ?? (s["studentName"] as? String) ?? ""
            let phone = (s["phone"] as? String) ?? (s["studentPhone"] as? String) ?? ""
            let club = (s["club"] as? String) ?? ""
            let location = (s["location"] as? String) ?? ""
            result.append(Student(id: id, name: name, phone: phone, club: club, location: location))
        }
        return result
    }
    
    // MARK: Auth
    struct LoginResult { let phone: String; let userType: String; let studentName: String }
    
    func login(phone: String, password: String, userType: String) async throws -> LoginResult {
        let req = try makePost(path: "/auth/login", body: [
            "phone": phone,
            "password": password,
            "userType": userType
        ])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError(message: "No HTTP response") }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard http.statusCode == 200, let success = json?["success"] as? Bool, success, let user = json?["user"] as? [String: Any] else {
            let msg = (json?["message"] as? String) ?? "Login failed"
            throw APIError(message: msg)
        }
        return LoginResult(
            phone: (user["phone"] as? String) ?? phone,
            userType: (user["userType"] as? String) ?? userType,
            studentName: (user["studentName"] as? String) ?? ""
        )
    }
    
    func registerCoach(phone: String, password: String, name: String, location: String, club: String) async throws {
        let req = try makePost(path: "/auth/register-coach", body: [
            "phone": phone,
            "password": password,
            "userType": "coach",
            "studentName": name,
            "location": location,
            "club": club
        ])
        let (_, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError(message: "Register coach failed")
        }
    }
    
    // MARK: Coach roster
    func fetchCoachRoster(phone: String, name: String, year: Int, month: Int) async throws -> [String: (time: String, location: String)] {
        let req = try makeRequest(path: "/coach-roster", query: [
            "phone": phone,
            "name": name,
            "year": String(year),
            "month": String(month)
        ])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError(message: "Roster HTTP error")
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let success = json?["success"] as? Bool, success else {
            throw APIError(message: "Roster API failed")
        }
        var result: [String: (String, String)] = [:]
        if let arr = json?["records"] as? [[String: Any]] {
            for it in arr {
                let date = (it["date"] as? String) ?? ""
                let time = (it["time"] as? String) ?? ""
                let location = (it["location"] as? String) ?? ""
                result[date] = (time, location)
            }
        }
        return result
    }
    
    // MARK: Coach work hours
    func fetchCoachWorkHours(phone: String, year: Int, month: Int, location: String, club: String) async throws -> [String: Double] {
        let req = try makeRequest(path: "/coach-work-hours", query: [
            "phone": phone,
            "year": String(year),
            "month": String(month),
            "location": location,
            "club": club
        ])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError(message: "WorkHours HTTP error")
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let success = json?["success"] as? Bool, success else {
            throw APIError(message: "WorkHours API failed")
        }
        var result: [String: Double] = [:]
        if let obj = json?["workHours"] as? [String: Any] {
            for (k, v) in obj {
                if let d = v as? Double { result[k] = d }
                else if let s = v as? String, let d = Double(s) { result[k] = d }
            }
        }
        return result
    }
    
    struct WorkHourEntry: Encodable {
        let phone: String
        let name: String
        let hours: Double
        let timeSlots: [String]
        let location: String?
        let club: String?
        
        init(phone: String, name: String, hours: Double, timeSlots: [String] = [], location: String? = nil, club: String? = nil) {
            self.phone = phone
            self.name = name
            self.hours = hours
            self.timeSlots = timeSlots
            self.location = location
            self.club = club
        }
    }
    
    func uploadCoachWorkHours(date: String, entries: [WorkHourEntry], location: String, club: String) async throws {
        let dictEntries: [[String: Any]] = entries.map { e in
            var d: [String: Any] = [
                "phone": e.phone,
                "name": e.name,
                "hours": e.hours,
                "timeSlots": e.timeSlots
            ]
            if let l = e.location { d["location"] = l }
            if let c = e.club { d["club"] = c }
            return d
        }
        let req = try makePost(path: "/coach-work-hours/batch", body: [
            "date": date,
            "entries": dictEntries,
            "location": location,
            "club": club
        ])
        let (_, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError(message: "Upload work hours failed")
        }
    }
    
    // MARK: Locations & Clubs
    func fetchLocations() async throws -> [String] {
        let req = try makeRequest(path: "/locations", query: [:])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError(message: "Locations HTTP error")
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let success = json?["success"] as? Bool, success else {
            throw APIError(message: "Locations API failed")
        }
        return (json?["locations"] as? [String]) ?? []
    }
    
    func fetchClubs(location: String) async throws -> [String] {
        let req = try makeRequest(path: "/clubs", query: ["location": location])
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError(message: "Clubs HTTP error")
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let success = json?["success"] as? Bool, success else {
            throw APIError(message: "Clubs API failed")
        }
        return (json?["clubs"] as? [String]) ?? []
    }
} 