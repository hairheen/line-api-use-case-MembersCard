// 環境設定を読み込む
const API_GATEWAY_URL = "https://g5ymewc8l3.execute-api.ap-northeast-1.amazonaws.com/dev/members_card/";
const liffId = "2006175866-5PDdy9xY"

// 言語設定の定数宣言
const defaultLang = "ja";
const supportedLangList = ["ja"]

// グローバル変数の宣言
let idToken = "";
let lang = "";

//多言語対応のメッセージ読み込み
let message = {}
$.getJSON("message.json", (data) => {
  message = data;
})

window.onload = function () {
  let myLiffId = liffId;
  initializeLiffOrDie(myLiffId);
};

/**
 * Check if myLiffId is null. If null do not initiate liff.
 * @param {string} myLiffId The LIFF ID of the selected element
 */
function initializeLiffOrDie(myLiffId) {
  if (!myLiffId) {
    document.getElementById("liffAppContent").classList.add("hidden");
    document.getElementById("liffIdErrorMessage").classList.remove("hidden");
  } else {
    initializeLiff(myLiffId);
  }
}

/**
 * Initialize LIFF
 * @param {string} myLiffId The LIFF ID of the selected element
 */
function initializeLiff(myLiffId) {
  liff
    .init({
      liffId: myLiffId,
    })
    .then(() => {
      // start to use LIFF's api
      initializeApp();
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("liffAppContent").classList.add("hidden");
      document
        .getElementById("liffInitErrorMessage")
        .classList.remove("hidden");
    });
}

function initializeApp() {
  //Event
  $("#button-add-point").on("click", function () {
    demoAddPoint();
  });

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: location.href });
  } else {
    document.getElementById("liffAppContent").classList.remove("hidden");
    // 获取并显示用户的名字和头像
    liff.getProfile()
      .then(profile => {
        document.getElementById('user-name').textContent = profile.displayName;
        document.getElementById('user-avatar').src = profile.pictureUrl;
      })
      .catch((err) => {
        console.error('Error getting profile: ', err);
      });
  }

  //言語設定のグローバル変数を上書き
  lang = getParam("lang") ? getParam("lang") : localStorage.getItem('locale');
  if (supportedLangList.indexOf(lang) < 0) {
    lang = defaultLang;
  }

  //DynamoDBのデータを特定ユーザーのidTokenより取得
  idToken = liff.getIDToken();
  getUserData(idToken);
  // setTimeout(demoAddPoint, 10000);
}

/**
 * ログインユーザーの会員データを取得する
 * @param {String} idToken
 */
function getUserData(idToken) {
  const body = {
    mode: "init",
    idToken: idToken,
  };
  // URLを開く
  let request = new XMLHttpRequest();
  request.open("POST", API_GATEWAY_URL, true);
  request.responseType = "json";

  request.onload = function () {
    if (request.readyState === 4 && request.status === 200) {
      const data = this.response;

      console.log('API response Get User Data:', data);

      // 检查 data 是否为 null 或 undefined，以及是否包含 barcodeNum 属性
      if (data && data.barcodeNum) {
        displayBarcode(data.barcodeNum);
        displayPoint(data.point);
        displayExpirationDate(data.pointExpirationDate);
      } else {
        console.error('API response does not contain the expected data.');
      }
    } else {
      console.warn(message.serverError[lang]);
    }
  };

  request.send(JSON.stringify(body));
}

/**
 * 画面にバーコードを表示する
 * @param {String} barcodeNum
 */
function displayBarcode(barcodeNum) {
  $("#barcode-img").barcode(String(barcodeNum), "ean13", {
    barWidth: 2,
    barHeight: 64,
    fontSize: 14,
    output: "svg",
  });
}

/**
 * 画面にポイントを表示する
 * @param {String} point
 */
function displayPoint(point) {
  $("#point-num").text(point);
}

/**
 * 画面にポイント期限日を表示する
 * @param {String} expirationDate
 */
function displayExpirationDate(expirationDate) {
  $("#expiration-date").text(expirationDate);
}

/**
 * デモのポイント付与操作を行う。
 * APIに接続し、DBを更新し更新後の値を取得する。
 */
function demoAddPoint() {
  const body = {
    mode: "buy",
    idToken: idToken,
    language: lang
  };

  let request = new XMLHttpRequest();
  request.open("POST", API_GATEWAY_URL, true);
  request.responseType = "json";

  request.onload = function () {
    if (request.readyState === 4 && request.status === 200) {
      alert(message.scanBarcode[lang]);
      const data = this.response;

      console.log('API response AddPoint:', data);

      // 添加检查以确保 data 存在并包含预期的属性
      if (data && data.point && data.pointExpirationDate) {
        displayPoint(data.point);
        displayExpirationDate(data.pointExpirationDate);
      } else {
        console.error('API response does not contain the expected data.');
        alert('Failed to retrieve point data.');
      }
    } else if (request.status === 403) {
      if (!alert(message.sessionExpired[lang])) {
        liff.logout();
        liff.login({ redirectUri: location.href });
      }
    } else {
      alert(message.error[lang]);
    }
  };

  request.send(JSON.stringify(body));
}

function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}