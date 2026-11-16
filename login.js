import { initCampus } from "./campus.js?v=arch72";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const loginForm = document.getElementById("authForm");
const signupForm = document.getElementById("signupForm");
const errorEl = document.getElementById("formError");
const signupError = document.getElementById("signupError");
const signupBtn = document.getElementById("toSignup");
const loginBtn = document.getElementById("toLogin");
const stage = document.getElementById("sceneStage");

initCampus(stage, { reducedMotion: reduceMotion });

function playFields(root) {
  if (reduceMotion || !window.gsap) return;
  window.gsap.fromTo(
    root.querySelectorAll(".field, .btn, .switch"),
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: "power3.out" },
  );
}

function showPanel(which) {
  const toLogin = which === "login";
  loginForm.hidden = !toLogin;
  signupForm.hidden = toLogin;
  document.title = toLogin ? "登录 · 温氏采购" : "注册 · 温氏采购";
  errorEl.hidden = true;
  signupError.hidden = true;
  playFields(toLogin ? loginForm : signupForm);
}

if (!reduceMotion && window.gsap) {
  window.gsap.fromTo(
    stage,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.9, ease: "power2.out" },
  );
  playFields(loginForm);
}

signupBtn.addEventListener("click", () => showPanel("signup"));
loginBtn.addEventListener("click", () => showPanel("login"));

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const account = loginForm.account.value.trim();
  const password = loginForm.password.value;
  errorEl.hidden = true;
  if (!account || !password) {
    errorEl.hidden = false;
    errorEl.textContent = "请输入账号和密码";
    return;
  }
  const btn = loginForm.querySelector(".btn");
  btn.disabled = true;
  btn.textContent = "登录中";
  window.setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "登录";
    errorEl.hidden = false;
    errorEl.textContent = "这是外观预览，还未接通账号。";
  }, 700);
});

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = signupForm.username.value.trim();
  const fullname = signupForm.fullname.value.trim();
  const email = signupForm.email.value.trim();
  const phone = signupForm.phone.value.trim();
  const password = signupForm.password.value;
  signupError.hidden = true;
  if (!username || !fullname || !email || !phone || !password) {
    signupError.hidden = false;
    signupError.textContent = "请完整填写注册信息";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    signupError.hidden = false;
    signupError.textContent = "请输入有效邮箱";
    return;
  }
  if (!/^1\d{10}$/.test(phone.replace(/\s|-/g, ""))) {
    signupError.hidden = false;
    signupError.textContent = "请输入11位手机号";
    return;
  }
  const btn = signupForm.querySelector(".btn");
  btn.disabled = true;
  btn.textContent = "注册中";
  window.setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "注册";
    signupError.hidden = false;
    signupError.textContent = "这是外观预览，还未接通账号。";
  }, 700);
});
