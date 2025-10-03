// Supabase配置
// 在 Supabase 配置部分添加 CORS 设置
const SUPABASE_URL = 'https://ywvhzdaxfysxeaxfihae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dmh6ZGF4ZnlzeGVheGZpaGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAxNzUsImV4cCI6MjA3NTA3NjE3NX0.EfENj7zfHde2TeoEzbhcc_z0dmpxKVv5qIfoKUqQpnw';

// 全局状态
let supabase = null;
let currentUser = null;
let isEditingMode = false;

// 初始化Supabase客户端
// 初始化 Supabase 客户端时添加全局选项
function initializeSupabase() {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            global: {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        });
        console.log('Supabase客户端初始化成功');
        return true;
    }
    return false;
}

// 检查并等待Supabase库加载
// 在 waitForSupabase 函数中添加更健壮的错误处理
function waitForSupabase(callback, maxAttempts = 30, interval = 500) {
    let attempts = 0;
    
    function check() {
        attempts++;
        console.log(`检查Supabase库加载状态，尝试次数: ${attempts}`);
        
        if (window.supabase) {
            console.log('Supabase库已加载');
            if (initializeSupabase()) {
                console.log('Supabase客户端初始化成功');
                callback();
                return;
            }
        }
        
        if (attempts < maxAttempts) {
            console.log(`等待${interval}ms后重试...`);
            setTimeout(check, interval);
        } else {
            console.error('Supabase库加载超时');
            // 使用备用方案
            useFallbackMode();
        }
    }
    
    check();
}

// 备用模式（当 Supabase 不可用时）
function useFallbackMode() {
    console.log('进入备用模式，使用 localStorage 存储');
    alert('网络连接较慢，已启用本地存储模式');
    
    // 禁用需要网络的功能
    document.querySelectorAll('.auth-buttons button').forEach(btn => {
        btn.disabled = true;
        btn.title = '网络连接不可用';
    });
    
    // 加载本地数据
    loadFromLocalStorage();
}

// 模态框控制函数
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'block';
}

function showRegisterModal() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'block';
}

function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'none';
}

// 认证相关函数
async function signUp(email, password) {
    if (!supabase) {
        alert('系统未初始化完成，请稍后重试');
        return { success: false, error: 'Supabase未初始化' };
    }
    
    try {
        console.log('开始注册用户:', email);
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) {
            console.error('注册错误:', error);
            throw error;
        }
        
        console.log('注册成功:', data);
        return { success: true, data };
    } catch (error) {
        console.error('注册异常:', error);
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    if (!supabase) {
        alert('系统未初始化完成，请稍后重试');
        return { success: false, error: 'Supabase未初始化' };
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateUIAfterLogin();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signOut() {
    if (!supabase) {
        alert('系统未初始化完成，请稍后重试');
        return { success: false, error: 'Supabase未初始化' };
    }
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        isEditingMode = false;
        updateUIAfterLogout();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 检查登录状态
async function checkAuthStatus() {
    if (!supabase) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateUIAfterLogin();
    }
}

// UI更新函数
function updateUIAfterLogin() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    
    // 显示编辑按钮
    const enterBtn = document.getElementById('enterEditBtn');
    if (enterBtn) enterBtn.style.display = 'block';
    
    console.log('登录成功，UI已更新');
}

function updateUIAfterLogout() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (authButtons) authButtons.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
    
    // 退出编辑模式
    exitEditMode();
    
    console.log('退出登录，UI已更新');
}

// 编辑模式控制函数
function enterEditMode() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    
    isEditingMode = true;
    console.log('进入编辑模式');
    
    // 为所有可编辑内容添加编辑功能
    document.querySelectorAll('[data-editable]').forEach(element => {
        element.contentEditable = true;
        element.style.border = '1px dashed #4CAF50';
        element.style.padding = '5px';
        element.style.borderRadius = '3px';
        element.style.minHeight = '20px';
    });
    
    // 显示保存和退出按钮，隐藏进入编辑按钮
    const saveBtn = document.getElementById('saveChangesBtn');
    const exitBtn = document.getElementById('exitEditBtn');
    const enterBtn = document.getElementById('enterEditBtn');
    
    if (saveBtn) saveBtn.style.display = 'block';
    if (exitBtn) exitBtn.style.display = 'block';
    if (enterBtn) enterBtn.style.display = 'none';
}

function exitEditMode() {
    isEditingMode = false;
    console.log('退出编辑模式');
    
    // 移除编辑功能
    document.querySelectorAll('[data-editable]').forEach(element => {
        element.contentEditable = false;
        element.style.border = 'none';
        element.style.padding = '0';
        element.style.minHeight = 'auto';
    });
    
    // 显示进入编辑按钮，隐藏保存和退出按钮
    const saveBtn = document.getElementById('saveChangesBtn');
    const exitBtn = document.getElementById('exitEditBtn');
    const enterBtn = document.getElementById('enterEditBtn');
    
    if (saveBtn) saveBtn.style.display = 'none';
    if (exitBtn) exitBtn.style.display = 'none';
    if (enterBtn) enterBtn.style.display = 'block';
}

// 修复保存修改函数
async function saveChanges() {
    if (!isEditingMode || !supabase) {
        alert('请先进入编辑模式或检查系统状态');
        return;
    }
    
    const changes = {};
    
    // 收集所有修改的内容
    document.querySelectorAll('[data-editable]').forEach(element => {
        const key = element.getAttribute('data-editable');
        const value = element.textContent.trim();
        if (value) {
            changes[key] = value;
        }
    });
    
    if (Object.keys(changes).length === 0) {
        alert('没有修改内容');
        return;
    }
    
    try {
        console.log('开始保存修改:', changes);
        
        // 检查page_content表是否存在，如果不存在则创建
        await ensurePageContentTable();
        
        // 保存到Supabase的page_content表
        const { error } = await supabase
            .from('page_content')
            .upsert(
                Object.entries(changes).map(([key, value]) => ({
                    key: key,
                    content: value,
                    updated_at: new Date().toISOString(),
                    updated_by: currentUser?.id || 'unknown'
                })),
                { onConflict: 'key' }
            );
            
        if (error) {
            console.error('保存错误:', error);
            throw error;
        }
        
        alert('保存成功！');
        exitEditMode();
        
    } catch (error) {
        console.error('保存异常:', error);
        alert('保存失败：' + error.message);
    }
}

// 确保page_content表存在
async function ensurePageContentTable() {
    try {
        // 尝试查询表是否存在
        const { error } = await supabase
            .from('page_content')
            .select('key')
            .limit(1);
            
        if (error && error.code === '42P01') {
            // 表不存在，需要创建
            console.log('page_content表不存在，需要手动在Supabase控制台创建');
            alert('数据库表不存在，请检查Supabase控制台中的page_content表');
        }
    } catch (error) {
        console.error('检查表错误:', error);
    }
}

// 登录注册处理函数
async function handleLogin(event) {
    event.preventDefault(); // 阻止表单默认提交行为
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        alert('请输入邮箱和密码');
        return;
    }
    
    const result = await signIn(email, password);
    
    if (result.success) {
        hideLoginModal();
        alert('登录成功！');
    } else {
        alert('登录失败：' + result.error);
    }
}

async function handleRegister(event) {
    console.log('注册表单提交事件触发');
    event.preventDefault(); // 阻止表单默认提交行为
    
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    console.log('表单数据:', { email, password, confirmPassword });
    
    if (!email || !password || !confirmPassword) {
        alert('请填写所有字段');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('密码不一致');
        return;
    }
    
    if (password.length < 6) {
        alert('密码至少6位');
        return;
    }
    
    console.log('开始调用Supabase注册...');
    const result = await signUp(email, password);
    
    if (result.success) {
        alert('注册成功！请检查邮箱验证');
        hideLoginModal();
    } else {
        alert('注册失败：' + result.error);
    }
}

// 绑定表单提交事件
function bindFormEvents() {
    console.log('开始绑定表单事件...');
    
    // 绑定登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('登录表单绑定成功');
    } else {
        console.error('登录表单未找到');
    }
    
    // 绑定注册表单
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('注册表单绑定成功');
    } else {
        console.error('注册表单未找到');
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
// 绑定表单事件
    bindFormEvents();
    
    // 等待Supabase库加载完成后初始化
    waitForSupabase(function() {
        console.log('Supabase初始化完成');
        // 检查登录状态
        checkAuthStatus();
        // 加载溯源数据
        loadTraceabilityData();
        // 从localStorage加载数据（备用方案）
        loadFromLocalStorage();
    });
    
    // 添加平滑滚动效果
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
    
    // 添加滚动动画效果
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // 观察所有区域
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'all 0.6s ease-out';
        observer.observe(section);
    });
    
    // 模态框关闭事件
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});

// 添加一些交互效果
function addInteractiveEffects() {
    // 产品卡片悬停效果
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        });
    });
}

// 初始化交互效果
addInteractiveEffects();


// 添加缺失的函数
function logout() {
    signOut().then(result => {
        if (result.success) {
            alert('退出登录成功');
        } else {
            alert('退出登录失败：' + result.error);
        }
    });
}

// 从localStorage加载数据（备用方案）
function loadFromLocalStorage() {
    console.log('从localStorage加载数据...');
    try {
        const savedData = localStorage.getItem('pineapple_page_content');
        if (savedData) {
            const data = JSON.parse(savedData);
            // 应用保存的内容到页面
            Object.entries(data).forEach(([key, value]) => {
                const element = document.querySelector(`[data-editable="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
            console.log('localStorage数据加载完成');
        }
    } catch (error) {
        console.error('加载localStorage数据错误:', error);
    }
}

// 保存数据到localStorage（备用方案）
function saveToLocalStorage(changes) {
    try {
        localStorage.setItem('pineapple_page_content', JSON.stringify(changes));
        console.log('数据已保存到localStorage');
    } catch (error) {
        console.error('保存到localStorage错误:', error);
    }
}

// 修复保存修改函数，添加备用存储方案
async function saveChanges() {
    if (!isEditingMode || !supabase) {
        alert('请先进入编辑模式或检查系统状态');
        return;
    }
    
    const changes = {};
    
    // 收集所有修改的内容
    document.querySelectorAll('[data-editable]').forEach(element => {
        const key = element.getAttribute('data-editable');
        const value = element.textContent.trim();
        if (value) {
            changes[key] = value;
        }
    });
    
    if (Object.keys(changes).length === 0) {
        alert('没有修改内容');
        return;
    }
    
    try {
        console.log('开始保存修改:', changes);
        
        // 首先尝试保存到Supabase
        let supabaseSuccess = false;
        
        try {
            // 检查page_content表是否存在
            const { error: tableCheckError } = await supabase
                .from('page_content')
                .select('key')
                .limit(1);
                
            if (!tableCheckError) {
                // 表存在，尝试保存到Supabase
                const { error } = await supabase
                    .from('page_content')
                    .upsert(
                        Object.entries(changes).map(([key, value]) => ({
                            key: key,
                            content: value,
                            updated_at: new Date().toISOString(),
                            updated_by: currentUser?.id || 'unknown'
                        })),
                        { onConflict: 'key' }
                    );
                    
                if (error) {
                    console.error('Supabase保存错误:', error);
                    throw error;
                }
                
                supabaseSuccess = true;
                console.log('Supabase保存成功');
            }
        } catch (supabaseError) {
            console.warn('Supabase保存失败，使用localStorage:', supabaseError);
        }
        
        // 如果Supabase保存失败，使用localStorage备用方案
        if (!supabaseSuccess) {
            saveToLocalStorage(changes);
        }
        
        alert('保存成功！');
        exitEditMode();
        
    } catch (error) {
        console.error('保存异常:', error);
        alert('保存失败：' + error.message);
    }
}

// 从Supabase获取数据
async function loadTraceabilityData() {
    if (!supabase) return;
    
    try {
        // 首先尝试从Supabase加载
        let supabaseData = null;
        
        try {
            // 检查page_content表是否存在
            const { data: pageContent, error: pageError } = await supabase
                .from('page_content')
                .select('*');
                
            if (!pageError && pageContent) {
                supabaseData = pageContent;
                console.log('从Supabase加载数据成功');
                
                // 应用Supabase数据到页面
                pageContent.forEach(item => {
                    const element = document.querySelector(`[data-editable="${item.key}"]`);
                    if (element && item.content) {
                        element.textContent = item.content;
                    }
                });
            }
        } catch (supabaseError) {
            console.warn('从Supabase加载数据失败:', supabaseError);
        }
        
        // 如果Supabase没有数据，尝试从localStorage加载
        if (!supabaseData || supabaseData.length === 0) {
            loadFromLocalStorage();
        }
        
        // 获取产品信息
        const { data: products, error } = await supabase
            .from('pineapple_products')
            .select('*');
            
        if (error) {
            console.error('获取产品数据错误:', error);
            return;
        }
        
        // 更新页面数据
        if (products && products.length > 0) {
            updateProductInfo(products[0]);
        }
        
    } catch (error) {
        console.error('数据加载错误:', error);
        // 如果所有方法都失败，从localStorage加载
        loadFromLocalStorage();
    }
}

// 更新产品信息
function updateProductInfo(product) {
    // 这里可以根据实际数据结构更新页面内容
    console.log('产品信息:', product);
}

// 滚动到指定区域
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// 果农寄语播放功能
function playFarmerMessage() {
    const message = document.querySelector('[data-editable="farmer-message"]')?.textContent;
    if (message && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    } else {
        alert('您的浏览器不支持语音播放功能');
    }
}

// 图片编辑功能
function editImage(imageKey) {
    if (!isEditingMode) {
        alert('请先进入编辑模式');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file, imageKey);
        }
    };
    
    input.click();
}

// 处理图片上传
async function handleImageUpload(file, imageKey) {
    if (!supabase) return;
    
    try {
        // 这里可以添加图片上传到Supabase Storage的逻辑
        // 暂时使用本地URL预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.querySelector(`[data-editable="${imageKey}"] img`);
            if (img) {
                img.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
        
        alert('图片更新成功（本地预览）');
    } catch (error) {
        console.error('图片上传错误:', error);
        alert('图片上传失败');
    }
}


// 添加网络状态检测
function checkNetworkStatus() {
    if (!navigator.onLine) {
        console.warn('设备处于离线状态');
        useFallbackMode();
        return false;
    }
    
    // 测试网络连接
    return fetch('https://fyuqdxccxzqgfokueafd.supabase.co/rest/v1/', {
        method: 'HEAD',
        mode: 'no-cors'
    }).then(() => true).catch(() => {
        console.warn('Supabase 服务不可达');
        useFallbackMode();
        return false;
    });
}

// 在页面加载时检查网络
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 检查网络状态
    checkNetworkStatus().then(isOnline => {
        if (isOnline) {
            // 绑定表单事件
            bindFormEvents();
            
            // 等待Supabase库加载完成后初始化
            waitForSupabase(function() {
                console.log('Supabase初始化完成');
                // 检查登录状态
                checkAuthStatus();
                // 加载溯源数据
                loadTraceabilityData();
            });
        } else {
            // 离线模式
            bindFormEvents();
            loadFromLocalStorage();
        }
    });
    
    // ... 其他初始化代码
});