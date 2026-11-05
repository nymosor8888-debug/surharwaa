
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

/* =========================================
   1. FIREBASE ТОХИРГОО
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyC2LYeoClVED4BESefZJ_OLs6F5o2wXKEA",
  authDomain: "nymosor-311a1.firebaseapp.com",
  projectId: "nymosor-311a1",
  storageBucket: "nymosor-311a1.firebasestorage.app",
  messagingSenderId: "405690008292",
  appId: "1:405690008292:web:4e2bf04989dba8ed7322f1"
};

const ADMIN_EMAIL = "nymosor8888@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/* =========================================
   2. ҮНДСЭН ХУВЬСАГЧ
========================================= */

const $ = id => document.getElementById(id);

let currentUser = null;
let currentRegistrationId = null;
let currentRegistration = null;

let stopRegistrationWatch = null;
let stopCountWatch = null;
let stopSettingsWatch = null;
let stopAdminWatch = null;

let isAdmin = false;

const defaultSettings = {
  location: "Төв Сур Харвааны Талбай",
  date: "2026 оны 11 сарын 15 (09:00)",
  phone: "9911-XXXX",
  fee: 20000,
  bank: "Админ тохируулна",
  holder: "—",
  account: "—"
};

let currentSettings = { ...defaultSettings };

const money = value =>
  Number(value || 0).toLocaleString("mn-MN") + "₮";

/* =========================================
   3. МЕССЕЖ ХАРУУЛАХ
========================================= */

function message(id, text, type = "err") {
  const el = $(id);

  if (!el) return;

  el.textContent = text;
  el.className = text ? `status ${type}` : "";
}

function errorText(error) {
  console.error(error);

  const messages = {
    "permission-denied": "Firebase Rules зөвшөөрөл өгөөгүй байна.",
    "unauthenticated": "Хэрэглэгч нэвтрээгүй байна.",
    "storage/unauthorized": "Зураг хадгалах эрх хүрэхгүй байна.",
    "storage/unknown": "Зураг хадгалах үед алдаа гарлаа.",
    "auth/invalid-credential": "Имэйл эсвэл нууц үг буруу байна.",
    "auth/invalid-email": "Имэйл хаяг буруу байна.",
    "auth/too-many-requests": "Олон удаа оролдсон байна. Түр хүлээнэ үү."
  };

  return messages[error?.code] ||
    error?.message ||
    "Тодорхойгүй алдаа гарлаа.";
}

/* =========================================
   4. БҮРТГЭЛИЙН ТАЛБАР ШАЛГАХ
========================================= */

const validationFields = [
  {
    id: "fullName",
    validate: value => value.length >= 2,
    error: "Овог, нэрээ зөв оруулна уу."
  },
  {
    id: "registerNum",
    validate: value => /^[А-ЯӨҮ]{2}\d{8}$/i.test(value),
    error: "Регистрийн дугаар 2 үсэг, 8 тоо байх ёстой."
  },
  {
    id: "phone",
    validate: value => /^\d{8}$/.test(value),
    error: "Утасны дугаар 8 оронтой байх ёстой."
  },
  {
    id: "age",
    validate: value => Number(value) >= 8 && Number(value) <= 100,
    error: "Нас 8–100 хооронд байх ёстой."
  },
  {
    id: "archerTitle",
    validate: value => value.length >= 2,
    error: "Сур харвааны цолоо оруулна уу."
  },
  {
    id: "affiliation",
    validate: value => value.length >= 2,
    error: "Харьяаллаа оруулна уу."
  }
];

function getFieldErrorElement(input) {
  let errorBox = input.parentElement.querySelector(".field-error");

  if (!errorBox) {
    errorBox = document.createElement("small");
    errorBox.className = "field-error";
    input.insertAdjacentElement("afterend", errorBox);
  }

  return errorBox;
}

function validateOneField(field) {
  const input = $(field.id);

  const valid = field.validate(input.value.trim());

  input.classList.toggle("invalid", !valid);

  getFieldErrorElement(input).textContent =
    valid ? "" : field.error;

  return valid;
}

function validateRegistration() {
  let valid = true;
  let firstInvalid = null;

  validationFields.forEach(field => {
    if (!validateOneField(field)) {
      valid = false;

      if (!firstInvalid) {
        firstInvalid = $(field.id);
      }
    }
  });

  const yearInput = $("titleYear");
  const year = yearInput.value.trim();

  if (year) {
    const yearValid =
      Number(year) >= 1950 &&
      Number(year) <= new Date().getFullYear();

    yearInput.classList.toggle("invalid", !yearValid);

    getFieldErrorElement(yearInput).textContent =
      yearValid ? "" : "Цол авсан оныг зөв оруулна уу.";

    if (!yearValid) {
      valid = false;
      if (!firstInvalid) firstInvalid = yearInput;
    }
  }

  $("validationSummary").classList.toggle("show", !valid);

  if (!valid && firstInvalid) {
    firstInvalid.focus();

    firstInvalid.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  return valid;
}

/* =========================================
   5. ТАЛБАРЫН EVENT
========================================= */

validationFields.forEach(field => {
  const input = $(field.id);

  input.addEventListener("blur", () => {
    validateOneField(field);
  });

  input.addEventListener("input", () => {
    if (input.classList.contains("invalid")) {
      validateOneField(field);
    }
  });
});

$("registerNum").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase();
});

$("phone").addEventListener("input", event => {
  event.target.value =
    event.target.value.replace(/\D/g, "").slice(0, 8);
});

/* =========================================
   6. ТОХИРГОО ХАРУУЛАХ
========================================= */

function applySettings(settings) {
  currentSettings = {
    ...defaultSettings,
    ...settings
  };

  $("infoLocation").textContent = currentSettings.location;
  $("infoDate").textContent = currentSettings.date;
  $("infoPhone").textContent = currentSettings.phone;

  $("infoFee").textContent = money(currentSettings.fee);
  $("formFee").textContent = money(currentSettings.fee);
  $("paymentFee").textContent = money(currentSettings.fee);

  $("bankName").textContent = currentSettings.bank || "—";
  $("accountHolder").textContent = currentSettings.holder || "—";
  $("accountNumber").textContent = currentSettings.account || "—";

  if (isAdmin) {
    $("adminBank").value = currentSettings.bank || "";
    $("adminHolder").value = currentSettings.holder || "";
    $("adminAccount").value = currentSettings.account || "";
    $("adminFee").value = currentSettings.fee || 0;

    $("editLocation").value = currentSettings.location;
    $("editDate").value = currentSettings.date;
    $("editPhone").value = currentSettings.phone;
    $("editFee").value = currentSettings.fee;
  }
}

/* =========================================
   7. FIREBASE-ЭЭС ТОХИРГОО УНШИХ
========================================= */

async function loadSettings() {
  const settingsRef = doc(db, "settings", "main");

  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    applySettings(settingsSnap.data());
  } else {
    applySettings(defaultSettings);
  }

  console.log("Settings loaded successfully");
}

/* =========================================
   8. ТОХИРГООНЫ ӨӨРЧЛӨЛТ ХЯНАХ
========================================= */

function watchSettings() {
  if (stopSettingsWatch) {
    stopSettingsWatch();
  }

  stopSettingsWatch = onSnapshot(
    doc(db, "settings", "main"),

    snap => {
      if (snap.exists()) {
        applySettings(snap.data());
      }
    },

    error => {
      console.error("Settings listener:", error);
      message(
        "registrationMsg",
        "Тохиргоо уншихад алдаа гарлаа: " + errorText(error)
      );
    }
  );
}

/* =========================================
   9. НИЙТ БҮРТГЭЛИЙН ТОО
========================================= */

function watchTotalCount() {
  if (stopCountWatch) {
    stopCountWatch();
  }

  stopCountWatch = onSnapshot(
    collection(db, "registrations"),

    snapshot => {
      $("totalCount").textContent =
        snapshot.size.toLocaleString("mn-MN");
    },

    error => {
      console.error("Count error:", error);
      $("totalCount").textContent = "—";
    }
  );
}

/* =========================================
   10. ХЭРЭГЛЭГЧИЙН БҮРТГЭЛИЙН ТӨЛӨВ
========================================= */

function watchMyRegistration(uid) {
  if (stopRegistrationWatch) {
    stopRegistrationWatch();
  }

  currentRegistrationId = uid;

  stopRegistrationWatch = onSnapshot(
    doc(db, "registrations", uid),

    snapshot => {
      if (!snapshot.exists()) {
        currentRegistration = null;
        $("uploadReceiptBtn").disabled = true;
        hideMandate();
        return;
      }

      const data = snapshot.data();

      currentRegistration = data;

      if (data.status === "approved") {
        showMandate(data, uid);

        message(
          "registrationMsg",
          "Таны төлбөр баталгаажлаа. Мандат нээгдсэн байна.",
          "ok"
        );
      } else {
        hideMandate();

        if (data.status === "pending_review") {
          message(
            "registrationMsg",
            "Төлбөрийн баримтыг админ шалгаж байна.",
            "pending"
          );
        } else if (data.status === "rejected") {
          message(
            "registrationMsg",
            "Баримт батлагдсангүй. Зөв баримтаа дахин илгээнэ үү.",
            "err"
          );
        } else {
          message(
            "registrationMsg",
            "Бүртгэл үүссэн. Төлбөрөө шилжүүлээд баримтаа илгээнэ үү.",
            "ok"
          );
        }
      }

      $("uploadReceiptBtn").disabled =
        !["awaiting_receipt", "rejected"].includes(data.status);
    },

    error => {
      console.error("Registration watch:", error);

      message(
        "registrationMsg",
        "Бүртгэлийн төлөв уншиж чадсангүй: " + errorText(error)
      );
    }
  );
}

/* =========================================
   11. БҮРТГЭЛ ҮҮСГЭХ
========================================= */

$("registrationForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!validateRegistration()) return;

  if (currentRegistration) {
    message(
      "registrationMsg",
      "Таны бүртгэл аль хэдийн үүссэн байна.",
      "pending"
    );
    return;
  }

  const button = $("registerBtn");

  button.disabled = true;
  button.textContent = "Бүртгэж байна...";

  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const user = auth.currentUser;

    if (!user) {
      throw new Error("Хэрэглэгчийн бүртгэл үүссэнгүй.");
    }

    const registration = {
      uid: user.uid,
      name: $("fullName").value.trim(),
      registerNum: $("registerNum").value.trim(),
      phone: $("phone").value.trim(),
      age: Number($("age").value),
      title: $("archerTitle").value.trim(),
      titleYear: $("titleYear").value.trim(),
      affiliation: $("affiliation").value.trim(),

      fee: Number(currentSettings.fee),
      status: "awaiting_receipt",

      receiptURL: "",
      createdAt: serverTimestamp()
    };

    await setDoc(
      doc(db, "registrations", user.uid),
      registration
    );

    currentRegistrationId = user.uid;

    watchMyRegistration(user.uid);

    $("registrationForm").reset();

    message(
      "registrationMsg",
      "Бүртгэл амжилттай үүслээ. Одоо төлбөрөө шилжүүлж баримтаа илгээнэ үү.",
      "ok"
    );

  } catch (error) {
    message(
      "registrationMsg",
      "Бүртгэл үүсгэхэд алдаа гарлаа: " + errorText(error)
    );
  } finally {
    button.disabled = false;
    button.textContent = "Бүртгүүлж төлбөр төлөх";
  }
});

/* =========================================
   12. ТӨЛБӨРИЙН БАРИМТ ИЛГЭЭХ
========================================= */

$("uploadReceiptBtn").addEventListener("click", async () => {
  const file = $("receiptFile").files[0];

  if (!file) {
    message("receiptMsg", "Эхлээд баримтын зургаа сонгоно уу.");
    return;
  }

  if (!currentRegistrationId || !currentRegistration) {
    message("receiptMsg", "Эхлээд бүртгэлээ үүсгэнэ үү.");
    return;
  }

  if (!["awaiting_receipt", "rejected"].includes(currentRegistration.status)) {
    message("receiptMsg", "Одоогоор баримт илгээх боломжгүй.");
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    message("receiptMsg", "Зөвхөн JPG, PNG, WEBP зураг оруулна уу.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    message("receiptMsg", "Зургийн хэмжээ 5 MB-аас бага байх ёстой.");
    return;
  }

  const button = $("uploadReceiptBtn");

  button.disabled = true;
  button.textContent = "Илгээж байна...";

  try {
    const path =
      `receipts/${currentRegistrationId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);

    const downloadURL = await getDownloadURL(storageRef);

    await updateDoc(
      doc(db, "registrations", currentRegistrationId),
      {
        receiptURL: downloadURL,
        receiptPath: path,
        status: "pending_review",
        receiptUploadedAt: serverTimestamp()
      }
    );

    $("receiptFile").value = "";

    message(
      "receiptMsg",
      "Төлбөрийн баримт амжилттай илгээгдлээ. Админ шалгана уу.",
      "ok"
    );

  } catch (error) {
    message(
      "receiptMsg",
      "Баримт илгээхэд алдаа гарлаа: " + errorText(error)
    );
  } finally {
    button.textContent = "Баримт илгээх";

    if (
      currentRegistration &&
      ["awaiting_receipt", "rejected"].includes(currentRegistration.status)
    ) {
      button.disabled = false;
    }
  }
});

/* =========================================
   13. МАНДАТ
========================================= */

function showMandate(data, id) {
  $("mandateId").textContent =
    id.slice(0, 8).toUpperCase();

  $("mandateName").textContent = data.name || "";
  $("mandateTitle").textContent = data.title || "";
  $("mandateAffiliation").textContent = data.affiliation || "";

  $("mandateSection").classList.remove("hidden");
}

function hideMandate() {
  $("mandateSection").classList.add("hidden");
}

$("printMandateBtn").addEventListener("click", () => {
  window.print();
});

/* =========================================
   14. АДМИН НЭВТРЭХ
========================================= */

$("showLoginBtn").addEventListener("click", () => {
  $("loginForm").classList.toggle("hidden");
});

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    message(
      "loginMsg",
      "Амжилттай нэвтэрлээ.",
      "ok"
    );

  } catch (error) {
    message(
      "loginMsg",
      "Нэвтрэхэд алдаа гарлаа: " + errorText(error)
    );
  }
});

/* =========================================
   15. АДМИНЫ БҮРТГЭЛИЙН ЖАГСААЛТ
========================================= */

function watchAdminRegistrations() {
  if (stopAdminWatch) {
    stopAdminWatch();
  }

  stopAdminWatch = onSnapshot(
    collection(db, "registrations"),

    snapshot => {
      const container = $("adminRegistrations");

      container.replaceChildren();

      if (snapshot.empty) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "Одоогоор бүртгэл алга.";
        container.appendChild(empty);
        return;
      }

      const registrations = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      registrations.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      registrations.forEach(data => {
        const card = document.createElement("div");
        card.className = "registration-card";

        const name = document.createElement("h3");
        name.textContent = data.name || "Нэргүй";

        const details = document.createElement("div");

        const fields = [
          `Регистр: ${data.registerNum || "—"}`,
          `Утас: ${data.phone || "—"}`,
          `Нас: ${data.age || "—"}`,
          `Цол: ${data.title || "—"}`,
          `Харьяалал: ${data.affiliation || "—"}`,
          `Төлбөр: ${money(data.fee)}`,
          `Төлөв: ${data.status || "—"}`
        ];

        fields.forEach(value => {
          const p = document.createElement("p");
          p.textContent = value;
          details.appendChild(p);
        });

        const status = document.createElement("span");
        status.className = "badge";

        if (data.status === "approved") {
          status.classList.add("approved");
          status.textContent = "Баталгаажсан";
        } else if (data.status === "pending_review") {
          status.classList.add("pending");
          status.textContent = "Шалгаж байна";
        } else if (data.status === "rejected") {
          status.classList.add("rejected");
          status.textContent = "Буцаагдсан";
        } else {
          status.textContent = "Хүлээгдэж байна";
        }

        card.appendChild(name);
        card.appendChild(details);
        card.appendChild(status);

        if (data.receiptURL) {
          const link = document.createElement("a");

          link.href = data.receiptURL;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Баримт харах";

          link.className = "receipt-link";

          card.appendChild(link);
        }

        const actions = document.createElement("div");
        actions.className = "actions";

        if (data.status === "pending_review") {
          const approve = document.createElement("button");

          approve.className = "btn small";
          approve.textContent = "Төлбөр батлах";

          approve.addEventListener("click", () => {
            updateRegistrationStatus(data.id, "approved");
          });

          const reject = document.createElement("button");

          reject.className = "btn danger small";
          reject.textContent = "Төлбөр буцаах";

          reject.addEventListener("click", () => {
            updateRegistrationStatus(data.id, "rejected");
          });

          actions.appendChild(approve);
          actions.appendChild(reject);
        }

        card.appendChild(actions);
        container.appendChild(card);
      });
    },

    error => {
      console.error("Admin registration error:", error);

      message(
        "adminSettingsMsg",
        "Бүртгэл уншихад алдаа гарлаа: " + errorText(error)
      );
    }
  );
}

/* =========================================
   16. ТӨЛБӨР БАТЛАХ / БУЦААХ
========================================= */

async function updateRegistrationStatus(uid, status) {
  if (!isAdmin) {
    alert("Админы эрх шаардлагатай.");
    return;
  }

  try {
    await updateDoc(
      doc(db, "registrations", uid),
      {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.email
      }
    );

    message(
      "adminSettingsMsg",
      status === "approved"
        ? "Төлбөр амжилттай баталгаажлаа."
        : "Төлбөрийг буцаалаа.",
      "ok"
    );

  } catch (error) {
    message(
      "adminSettingsMsg",
      "Төлөв өөрчлөхөд алдаа гарлаа: " + errorText(error)
    );
  }
}

/* =========================================
   17. АДМИН ДАНСНЫ ТОХИРГОО ХАДГАЛАХ
========================================= */

$("savePaymentSettings").addEventListener("click", async () => {
  if (!isAdmin) {
    message("adminSettingsMsg", "Админы эрх шаардлагатай.");
    return;
  }

  const bank = $("adminBank").value.trim();
  const holder = $("adminHolder").value.trim();
  const account = $("adminAccount").value.trim();
  const fee = Number($("adminFee").value);

  if (!bank || !holder || !account || !Number.isFinite(fee) || fee < 0) {
    message(
      "adminSettingsMsg",
      "Бүх талбарыг зөв бөглөнө үү."
    );
    return;
  }

  try {
    await setDoc(
      doc(db, "settings", "main"),
      {
        ...currentSettings,
        bank,
        holder,
        account,
        fee,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    message(
      "adminSettingsMsg",
      "Дансны мэдээлэл амжилттай хадгалагдлаа.",
      "ok"
    );

  } catch (error) {
    message(
      "adminSettingsMsg",
      "Хадгалахад алдаа гарлаа: " + errorText(error)
    );
  }
});

/* =========================================
   18. ТЭМЦЭЭНИЙ МЭДЭЭЛЭЛ ЗАСАХ
========================================= */

$("editInfoBtn").addEventListener("click", () => {
  $("infoForm").classList.toggle("hidden");

  $("editLocation").value = currentSettings.location;
  $("editDate").value = currentSettings.date;
  $("editPhone").value = currentSettings.phone;
  $("editFee").value = currentSettings.fee;
});

$("infoForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const location = $("editLocation").value.trim();
  const date = $("editDate").value.trim();
  const phone = $("editPhone").value.trim();
  const fee = Number($("editFee").value);

  if (!location || !date || !phone || !Number.isFinite(fee) || fee < 0) {
    message("infoMsg", "Мэдээллээ зөв бөглөнө үү.");
    return;
  }

  try {
    await setDoc(
      doc(db, "settings", "main"),
      {
        ...currentSettings,
        location,
        date,
        phone,
        fee,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    message(
      "infoMsg",
      "Тэмцээний мэдээлэл хадгалагдлаа.",
      "ok"
    );

  } catch (error) {
    message(
      "infoMsg",
      "Алдаа: " + errorText(error)
    );
  }
});

/* =========================================
   19. ДАНСНЫ ДУГААР ХУУЛАХ
========================================= */

$("copyAccountBtn").addEventListener("click", async () => {
  const account = $("accountNumber").textContent.trim();

  if (!account || account === "—") {
    alert("Дансны дугаар оруулаагүй байна.");
    return;
  }

  try {
    await navigator.clipboard.writeText(account);
    alert("Дансны дугаар хууллаа.");
  } catch (error) {
    alert("Хуулах боломжгүй байна.");
  }
});

/* =========================================
   20. АДМИН ГАРАХ
========================================= */

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    message("loginMsg", "Админ системээс гарлаа.", "ok");
  } catch (error) {
    message("loginMsg", errorText(error));
  }
});

/* =========================================
   21. FIREBASE AUTH ТӨЛӨВ
========================================= */

onAuthStateChanged(auth, async user => {
  currentUser = user;

  isAdmin =
    !!user &&
    !user.isAnonymous &&
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  $("adminPanel").classList.toggle("hidden", !isAdmin);
  $("editInfoBtn").classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    $("showLoginBtn").classList.add("hidden");
    $("loginForm").classList.add("hidden");

    await loadSettings();

    watchAdminRegistrations();

  } else {
    $("showLoginBtn").classList.remove("hidden");

    if (stopAdminWatch) {
      stopAdminWatch();
      stopAdminWatch = null;
    }
  }

  if (user?.isAnonymous) {
    watchMyRegistration(user.uid);
  } else if (!user) {
    currentRegistration = null;
    currentRegistrationId = null;

    if (stopRegistrationWatch) {
      stopRegistrationWatch();
      stopRegistrationWatch = null;
    }

    $("uploadReceiptBtn").disabled = true;
    hideMandate();
  }
});

/* =========================================
   22. ВЕБСАЙТ ЭХЛҮҮЛЭХ
========================================= */

async function initializeWebsite() {
  try {
    await loadSettings();

    watchTotalCount();
    watchSettings();

    console.log("Веб систем амжилттай эхэллээ.");

  } catch (error) {
    console.error("Firebase initialization error:", error);

    message(
      "registrationMsg",
      "Firebase-тэй холбогдож чадсангүй: " + errorText(error)
    );
  }
}

/* ЭХЛЭЛ */
initializeWebsite();
