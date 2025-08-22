// Security helpers and runtime configuration
(function(){
  window.AppSecurity = {
    cspReady: true,
    nonce: null,
    allowInline: true
  };

  // Basic console banner to verify script loaded
  if (typeof console !== 'undefined') {
    console.log('[security.js] loaded');
  }
})();

// 安全配置和安全功能
class SecurityManager {
    constructor() {
        this.securityConfig = {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15分钟
            sessionTimeout: 30 * 60 * 1000, // 30分钟
            csrfProtection: true,
            xssProtection: true,
            contentSecurityPolicy: true
        };
        
        this.loginAttempts = new Map();
        this.initSecurity();
    }

    // 初始化安全功能
    initSecurity() {
        this.setupCSP();
        this.setupXSSProtection();
        this.setupCSRFProtection();
        this.setupSessionTimeout();
        this.setupInputSanitization();
        this.setupRateLimiting();
    }

    // 设置内容安全策略
    setupCSP() {
        if (this.securityConfig.contentSecurityPolicy) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = `
                default-src 'self' https: data:;
                script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
                style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
                style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
                font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com;
                img-src 'self' data: https:;
                connect-src 'self' https://swimming-attendance-system-production.up.railway.app;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
            `.replace(/\s+/g, ' ').trim();
            document.head.appendChild(meta);
        }
    }

    // 设置XSS防护
    setupXSSProtection() {
        if (this.securityConfig.xssProtection) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-XSS-Protection';
            meta.content = '1; mode=block';
            document.head.appendChild(meta);
        }
    }

    // 设置CSRF防护
    setupCSRFProtection() {
        if (this.securityConfig.csrfProtection) {
            // 生成CSRF令牌
            const csrfToken = this.generateCSRFToken();
            localStorage.setItem('csrf_token', csrfToken);
            
            // 为所有表单添加CSRF令牌
            this.addCSRFTokenToForms();
        }
    }

    // 生成CSRF令牌
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // 为表单添加CSRF令牌
    addCSRFTokenToForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = localStorage.getItem('csrf_token');
            form.appendChild(csrfInput);
        });
    }

    // 设置会话超时
    setupSessionTimeout() {
        let lastActivity = Date.now();
        
        // 监听用户活动
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            });
        });

        // 检查会话超时
        setInterval(() => {
            if (Date.now() - lastActivity > this.securityConfig.sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000); // 每分钟检查一次
    }

    // 处理会话超时
    handleSessionTimeout() {
        alert('会话已超时，请重新登入');
        this.logout();
    }

    // 设置输入净化
    setupInputSanitization() {
        // 为所有输入框添加输入验证
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = this.sanitizeInput(e.target.value);
            });
        });
    }

    // 输入净化函数
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // 移除潜在的XSS代码
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    // 设置速率限制
    setupRateLimiting() {
        // 为API调用添加速率限制
        this.rateLimitMap = new Map();
    }

    // 检查速率限制
    checkRateLimit(identifier, maxRequests = 10, timeWindow = 60000) {
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(identifier) || [];
        
        // 清理过期的请求记录
        const validRequests = userRequests.filter(time => now - time < timeWindow);
        
        if (validRequests.length >= maxRequests) {
            return false; // 超过限制
        }
        
        // 添加新请求
        validRequests.push(now);
        this.rateLimitMap.set(identifier, validRequests);
        
        return true; // 允许请求
    }

    // 登录尝试限制
    checkLoginAttempts(identifier) {
        const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        
        // 检查是否在锁定期间
        if (attempts.count >= this.securityConfig.maxLoginAttempts) {
            if (now - attempts.lastAttempt < this.securityConfig.lockoutDuration) {
                return false; // 仍在锁定期间
            } else {
                // 锁定期间已过，重置计数
                attempts.count = 0;
            }
        }
        
        return true; // 允许登录尝试
    }

    // 记录登录尝试
    recordLoginAttempt(identifier, success) {
        const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
        
        if (success) {
            // 登录成功，重置计数
            attempts.count = 0;
        } else {
            // 登录失败，增加计数
            attempts.count++;
        }
        
        attempts.lastAttempt = Date.now();
        this.loginAttempts.set(identifier, attempts);
    }

    // 安全登出
    logout() {
        // 清除所有敏感数据
        localStorage.removeItem('current_user_phone');
        localStorage.removeItem('current_user_type');
        localStorage.removeItem('csrf_token');
        
        // 清除登录尝试记录
        this.loginAttempts.clear();
        
        // 重定向到登录页面
        window.location.reload();
    }

    // 验证CSRF令牌
    validateCSRFToken(token) {
        const storedToken = localStorage.getItem('csrf_token');
        return token === storedToken;
    }

    // 安全日志记录
    logSecurityEvent(event, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('Security Event:', logEntry);
        
        // 可以发送到安全日志服务器
        // this.sendSecurityLog(logEntry);
    }

    // 检查环境安全性
    checkEnvironmentSecurity() {
        const securityChecks = {
            https: window.location.protocol === 'https:',
            localhost: window.location.hostname === 'localhost',
            railway: window.location.hostname.includes('railway.app'),
            devTools: this.detectDevTools()
        };
        
        return securityChecks;
    }

    // 检测开发者工具
    detectDevTools() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            this.logSecurityEvent('DevTools Detected', { width: widthThreshold, height: heightThreshold });
            return true;
        }
        
        return false;
    }
}

// 创建全局安全管理器实例
const securityManager = new SecurityManager();

// 导出安全功能
window.SecurityManager = SecurityManager;
window.securityManager = securityManager;

// 安全事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 记录页面加载安全事件
    securityManager.logSecurityEvent('Page Loaded', {
        url: window.location.href,
        timestamp: new Date().toISOString()
    });
    
    // 检查环境安全性
    const envSecurity = securityManager.checkEnvironmentSecurity();
    securityManager.logSecurityEvent('Environment Check', envSecurity);
});

// 防止右键菜单（可选）
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    securityManager.logSecurityEvent('Right Click Blocked', { x: e.clientX, y: e.clientY });
});

// 防止F12键
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        securityManager.logSecurityEvent('DevTools Shortcut Blocked', { key: e.key });
    }
}); 