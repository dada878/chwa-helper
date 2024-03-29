class AnswerDB {
    static getQuizID() {
        return location.href.split("/").at(-1);
    }
    static save(data) {
        const id = this.getQuizID();
        localStorage.setItem(id, JSON.stringify(data));
    }
    static empty() {
        const id = this.getQuizID();
        return (localStorage.getItem(id) === null);
    }
    static load() {
        const id = this.getQuizID();
        return JSON.parse(localStorage.getItem(id));
    }
}

class QueryHelper {
    static queryProblems() {
        return document.querySelectorAll('div[ng-repeat="q in qt.qlist"]:not([style="float: left;"]):is(.ng-scope)');
    }
    static queryDescriptionOfProblem(problem) {
        return problem.querySelector('p[ng-bind-html="q.q | trustedHtml"]');
    }
    static queryOptionsOfProblem(problem) {
        return problem.querySelectorAll('span[ng-click="qt124Sel(option.value)"]');
    }
    static queryRightOptionsOfProblem(problem) {
        return problem.querySelectorAll('.rightOption');
    }
    static queryProblemSwitchButtons() {
        return document.querySelectorAll('.btn:is(.ng-binding):not(.ng-hide):not([id*="sendAns"])');
    }
    static queryNavbar() {
        return document.getElementsByClassName("hidden-xs ng-scope")[0];
    }
    static queryLoadAnswerButton() {
        return document.getElementById("chwa-helper-answer-btn");
    }
    static queryActionButtonGroup() {
        return document.querySelector(`div[ng-hide=showTotalScore]`);
    }
}

class PadeRender {
    static createElementFromHTML(htmlString) {
        const ele = document.createElement("div");
        ele.innerHTML = htmlString;
        return ele.firstChild;
    }
    static isFinishOrQuizPage() {
        return !!QueryHelper.queryActionButtonGroup();
    }
    static render() {
        if (!this.isRendered()) {
            if (!this.isFinishOrQuizPage()) return;
            this.injectAds();
            this.addLoadAnswerBtn();
            this.addGuessBtn();
        }
        QueryHelper.queryLoadAnswerButton().style.cursor = AnswerDB.empty() ? "not-allowed" : "pointer";
    }
    static isRendered() {
        return !!QueryHelper.queryLoadAnswerButton();
    }
    static injectAds() {
        QueryHelper.queryNavbar().appendChild(
            this.createElementFromHTML(`<div class="col-xs-3 col-md-3" src="images/ChwaLogo3.png" style=""><h3 style="font-weight: bolder;color: #003B89;filter: drop-shadow(0px 0px 3px lightblue);cursor: pointer;" onclick="window.open('https://microsoftedge.microsoft.com/addons/detail/%E5%85%A8%E8%8F%AF%E5%8A%A9%E6%89%8B/caddmfhjodlapcapohemggjjaboahpdp','_blank')">全華助手 v1.0.2</h3></div>`)
        );
    }
    static addLoadAnswerBtn() {
        QueryHelper.queryActionButtonGroup().appendChild(
            this.createElementFromHTML(`<button id="chwa-helper-answer-btn" class="btn" ng-hide="showQ==Qcount" ng-click="nextQ()" onclick="const evt = document.createEvent('Event');evt.initEvent('loadAnswer', true, false);document.dispatchEvent(evt);" style="background-color: rgb(139 28 255); color: rgb(255, 255, 255); padding: 6px 12px; font-weight: bolder;">填入答案</button>`)
        );
    }
    static addGuessBtn() {
        QueryHelper.queryActionButtonGroup().appendChild(
            this.createElementFromHTML(`<button id="chwa-helper-guess-btn" class="btn" ng-hide="showQ==Qcount" ng-click="nextQ()" onclick="const evt = document.createEvent('Event');evt.initEvent('guessAnswer', true, false);document.dispatchEvent(evt);" style="background-color: rgb(221 0 0);margin-left: 3px; color: rgb(255, 255, 255); padding: 6px 12px; font-weight: bolder;">猜題</button>`)
        );
    }
}

class QuizManager {
    static saveAnswer() {
        const answer = {};
        const problems = QueryHelper.queryProblems();
        for (const problem of problems) {
            const description = QueryHelper.queryDescriptionOfProblem(problem).innerHTML;
            const answerOptionElements = QueryHelper.queryRightOptionsOfProblem(problem);
            answer[description] = [];
            for (let opts of answerOptionElements) {
                answer[description].push(opts.innerHTML);
            }
        }
        alert(`答案紀錄成功 共 ${Object.keys(answer).length} 題！`);
        AnswerDB.save(answer);
    }
    static loadAnswer() {
        if (AnswerDB.empty()) return alert("暫無儲存的答案，請先至少交卷一次後再使用");
        const answer = AnswerDB.load();
        const problems = QueryHelper.queryProblems();
        const btns = QueryHelper.queryProblemSwitchButtons();
        let wrongCount = 0;
        const problemsWriten = [];
        const failedWriten = [];
        const leftAnswerTable = {};
        const editDistance = function (word1, word2) {
            let dp = Array(word1.length + 1).fill(null).map(() => (Array(word2.length + 1).fill(0)));
            for (let i = 0; i < dp.length; i++) dp[i][0] = i
            for (let i = 0; i < dp[0].length; i++) dp[0][i] = i
            for (let i = 1; i < dp.length; i++) {
                for (let j = 1; j < dp[0].length; j++) {
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (word1[i - 1] != word2[j - 1] ? 1 : 0));
                }
            }
            return dp[dp.length - 1][dp[0].length - 1];
        }
        const writeAnswer = function (problem, defaultDescription = null) {
            const description = defaultDescription ?? QueryHelper.queryDescriptionOfProblem(problem).innerHTML;
            const options = QueryHelper.queryOptionsOfProblem(problem);
            let flag = false;
            for (let opt of options) {
                try {
                    for (let ansOpt of answer[description]) {
                        if (ansOpt == opt.innerHTML) {
                            opt.click();
                            flag = true;
                        }
                    }
                } catch (e) { }
            }
            if (!flag) {
                wrongCount++;
                let minDistance = Number.MAX_SAFE_INTEGER;
                let minDistanceElement = null;
                for (let opt of options) {
                    try {
                        for (let ansOpt of answer[description]) {
                            let distance = editDistance(ansOpt, opt.innerHTML);
                            if (distance < minDistance) {
                                minDistance = distance;
                                minDistanceElement = opt;
                            }
                        }
                    } catch (e) {
                        wrongCount++;
                    }
                }
                if (minDistanceElement) {
                    flag = true;
                    minDistanceElement.click();
                }
            }
            if (!flag) failedWriten.push(problem);
            else problemsWriten.push(description);
        }
        for (let problem of problems) writeAnswer(problem);
        for (const key of Object.keys(answer)) {
            if (!problemsWriten.includes(key)) leftAnswerTable[key] = answer[key];
        }
        for (const problem of failedWriten) {
            const description = QueryHelper.queryDescriptionOfProblem(problem).innerHTML;
            let minDistance = Number.MAX_SAFE_INTEGER;
            let minDistanceDescription = null;
            for (const answerDescription of Object.keys(leftAnswerTable)) {
                let distance = editDistance(answerDescription, description);
                if (distance < minDistance) {
                    minDistance = distance;
                    minDistanceDescription = answerDescription;
                }
            }
            writeAnswer(problem, minDistanceDescription);
        }
        if (wrongCount) alert(`填入完畢 共有 ${wrongCount} 題作答可能錯誤！`);
        else alert(`答案填入完畢！`);
        for (const btn of btns) btn.click();
    }
    static guessAnswer() {
        const problems = QueryHelper.queryProblems();
        for (let problem of problems) {
            const options = QueryHelper.queryOptionsOfProblem(problem);
            options[Math.floor(Math.random() * (3 - 0 + 1)) + 0].click();
        }
        for (const btn of QueryHelper.queryProblemSwitchButtons()) btn.click();
        alert(`猜完所有題目了！`);
    }
}

class PageStatusManager {
    static isFinishPage() {
        return !!document.querySelector(`div[ng-hide="showTotalScore"].ng-hide`);
    }
    static isQuizPage() {
        return !!document.querySelector(`div[ng-show="showTotalScore"].ng-hide`);
    }
}

class ChwaHelper {
    static init() {
        console.log("[Chwa-Helper] Plugin loaded");
        document.addEventListener('loadAnswer', () => QuizManager.loadAnswer());
        document.addEventListener('guessAnswer', () => QuizManager.guessAnswer());
        PadeRender.render();
        setInterval(() => {
            if (PageStatusManager.isFinishPage()) {
                PadeRender.render();
                if (AnswerDB.empty()) QuizManager.saveAnswer();
            } else if (PageStatusManager.isQuizPage()) {
                PadeRender.render();
            }
        }, 100);
    }
}

ChwaHelper.init();