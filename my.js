// Assume: examData = { exams: { 'jee-mains': { questions: [...] }, ... } };

document.addEventListener('DOMContentLoaded', () => {
    // ---- SECTION/FORM/ELEMENT SELECTORS ----
    const loginSection = document.getElementById('login-section');
    const examSelectionSection = document.getElementById('exam-selection-section');
    const examInterfaceSection = document.getElementById('exam-interface-section');
    const resultSection = document.getElementById('result-section');
    const instructionsModal = document.getElementById('instructions-modal');
    const loadingSpinner = document.getElementById('loading-spinner');

    const loginForm = document.getElementById('login-form');
    const examOptions = document.querySelectorAll('.exam-option');
    const timerDisplay = document.getElementById('timer');
    const themeToggle = document.getElementById('theme-toggle');
    const questionTitle = document.getElementById('question-title');
    const questionOptions = document.getElementById('question-options');
    const questionList = document.getElementById('question-list');
    const questionSearch = document.getElementById('question-search');
    const prevQuestionBtn = document.getElementById('prev-question');
    const nextQuestionBtn = document.getElementById('next-question');
    const markQuestionBtn = document.getElementById('mark-question');
    const submitExamBtn = document.getElementById('submit-exam');
    const clearResponseBtn = document.getElementById('clear-response');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const backToSelection = document.getElementById('back-to-selection');
    const toggleFullscreen = document.getElementById('toggle-fullscreen');
    const progressBar = document.getElementById('progress-bar');
    const startExamBtn = document.getElementById('start-exam-btn');
    const subjectBreakdownList = document.getElementById('subject-breakdown-list');
    const solutionsList = document.getElementById('solutions-list');
    const backToSelectionFromResults = document.getElementById('back-to-selection-from-results');
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Results
    const totalScoreElement = document.getElementById('total-score');
    const correctAnswersElement = document.getElementById('correct-answers');
    const incorrectAnswersElement = document.getElementById('incorrect-answers');
    const unattemptedAnswersElement = document.getElementById('unattempted-answers');

    // State
    let currentExam = null;
    let currentQuestionIndex = 0;
    let examQuestions = [];
    let selectedAnswers = {};
    let markedQuestions = new Set();
    let timeRemaining = 0;
    let timerInterval = null;
    let userData = {};
    let examResults = JSON.parse(localStorage.getItem('examResults')) || [];
    let copyAttempts = 0;
    const maxCopyAttempts = 1;

    // Simulated authentication (for demo)
    const mockUsers = {
        'student@example.com': {
            fullName: 'Test Student',
            password: 'password123',
            department: 'CSE',
            year: '2'
        }
    };

    // Error elements
    const fullNameError = document.getElementById('full-name-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');

    // --- Login Handler ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        userData = {
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            department: document.getElementById('department').value,
            year: document.getElementById('year').value
        };

        let isValid = true;
        if (userData.fullName.length < 2) {
            fullNameError.textContent = 'Name must be at least 2 characters';
            fullNameError.style.display = 'block';
            isValid = false;
        } else { fullNameError.style.display = 'none'; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            emailError.textContent = 'Please enter a valid email';
            emailError.style.display = 'block';
            isValid = false;
        } else { emailError.style.display = 'none'; }

        if (userData.password.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters';
            passwordError.style.display = 'block';
            isValid = false;
        } else { passwordError.style.display = 'none'; }

        if (!isValid) return;

        loadingSpinner.classList.remove('hidden');
        setTimeout(() => {
            if (mockUsers[userData.email] && mockUsers[userData.email].password === userData.password) {
                loadingSpinner.classList.add('hidden');
                loginSection.classList.add('hidden');
                examSelectionSection.classList.remove('hidden');
                localStorage.setItem('userData', JSON.stringify(userData));
            } else {
                loadingSpinner.classList.add('hidden');
                alert('Invalid credentials');
            }
        }, 1000);
    });

    // --- Exam Selection ---
    examOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentExam = option.getAttribute('data-exam');
            examSelectionSection.classList.add('hidden');
            instructionsModal.classList.remove('hidden');
        });
    });

    // --- Start Exam ---
    startExamBtn.addEventListener('click', () => {
        instructionsModal.classList.add('hidden');
        examInterfaceSection.classList.remove('hidden');
        initializeExam(currentExam);
    });

    // --- Initialize Exam ---
    function initializeExam(examType) {
        selectedAnswers = {};
        markedQuestions.clear();
        currentQuestionIndex = 0;
        examQuestions = examData.exams[examType].questions;
        // Validate IDs: optional, helps dev catch data errors
        // validateIDs(examQuestions); 
        const timers = { 'jee-mains': 90 * 60, 'neet': 180 * 60, 'gate': 180 * 60, 'upsc': 120 * 60 };
        timeRemaining = timers[examType];
        startTimer();
        renderQuestionPanel();
        renderCurrentQuestion();
        updateProgressBar();
    }

    // --- Highlight Selected Option ---
    function highlightSelectedOption(optionIndex) {
        const optionElements = questionOptions.children;
        Array.from(optionElements).forEach((el, index) => {
            el.classList.remove('bg-blue-200');
            if (index === optionIndex) el.classList.add('bg-blue-200');
        });
    }

    // --- Render Question Panel (index-based) ---
    function renderQuestionPanel(filter = '') {
        questionList.innerHTML = '';
        examQuestions.forEach((question, index) => {
            if (filter && !question.text.toLowerCase().includes(filter.toLowerCase())) return;
            const questionButton = document.createElement('div');
            questionButton.className = 'question-panel-item';
            if (selectedAnswers.hasOwnProperty(question.id)) questionButton.classList.add('answered');
            if (markedQuestions.has(question.id)) questionButton.classList.add('marked');
            questionButton.textContent = index + 1; // Panel displayed order
            questionButton.addEventListener('click', () => {
                currentQuestionIndex = index;
                renderCurrentQuestion();
            });
            questionList.appendChild(questionButton);
        });
    }

    // --- Render Current Question (index-based) ---
    function renderCurrentQuestion() {
        const question = examQuestions[currentQuestionIndex];
        questionTitle.textContent = `${question.subject}: ${question.text}`;
        questionOptions.innerHTML = '';
        question.options.forEach((option, optionIndex) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'p-4 rounded-lg cursor-pointer hover:bg-gray-100';
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => {
                selectAnswer(optionIndex);
                highlightSelectedOption(optionIndex);
                updateProgressBar();
            });
            questionOptions.appendChild(optionElement);
        });
        if (selectedAnswers[question.id] !== undefined) {
            highlightSelectedOption(selectedAnswers[question.id]);
        }
    }

    // --- Select Answer ---
    function selectAnswer(optionIndex) {
        const question = examQuestions[currentQuestionIndex];
        selectedAnswers[question.id] = optionIndex;
        renderQuestionPanel(questionSearch.value);
    }

    // --- Mark Question ---
    markQuestionBtn.addEventListener('click', () => {
        const question = examQuestions[currentQuestionIndex];
        if (markedQuestions.has(question.id)) markedQuestions.delete(question.id);
        else markedQuestions.add(question.id);
        renderQuestionPanel(questionSearch.value);
    });

    // --- Navigation (index-based) ---
    prevQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    });

    nextQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
    });

    // --- Clear Response ---
    clearResponseBtn.addEventListener('click', () => {
        const question = examQuestions[currentQuestionIndex];
        delete selectedAnswers[question.id];
        renderCurrentQuestion();
        renderQuestionPanel(questionSearch.value);
        updateProgressBar();
    });

    // --- Timer ---
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            if (timeRemaining <= 300) timerDisplay.classList.add('timer-warning');
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                alert('Time is up! Submitting exam.');
                submitExam();
            }
        }, 1000);
    }

    // --- Theme Toggle ---
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        themeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // --- Sidebar Toggle ---
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
    });

    // --- Back to Selection ---
    backToSelection.addEventListener('click', () => {
        if (confirm('Are you sure? Your progress will be lost.')) {
            clearInterval(timerInterval);
            examInterfaceSection.classList.add('hidden');
            examSelectionSection.classList.remove('hidden');
            sidebar.classList.add('-translate-x-full');
        }
    });

    // --- Fullscreen Toggle ---
    toggleFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    });

    // --- Question Search ---
    questionSearch.addEventListener('input', (e) => {
        renderQuestionPanel(e.target.value);
    });

    // --- Update Progress Bar ---
    function updateProgressBar() {
        const answered = Object.keys(selectedAnswers).length;
        const total = examQuestions.length;
        const percentage = (answered / total) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    // --- Submit Exam ---
    submitExamBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit your exam?')) submitExam();
    });

    function submitExam() {
        clearInterval(timerInterval);
        loadingSpinner.classList.remove('hidden');
        setTimeout(() => {
            const totalQuestions = examQuestions.length;
            let correctAnswers = 0;
            let incorrectAnswers = 0;
            let unattemptedAnswers = 0;
            const subjectStats = {};

            examQuestions.forEach(question => {
                if (!subjectStats[question.subject]) {
                    subjectStats[question.subject] = { correct: 0, total: 0 };
                }
                subjectStats[question.subject].total++;
                if (selectedAnswers[question.id] === undefined) {
                    unattemptedAnswers++;
                } else if (selectedAnswers[question.id] === question.correctAnswer) {
                    correctAnswers++;
                    subjectStats[question.subject].correct++;
                } else {
                    incorrectAnswers++;
                }
            });

            const score = (correctAnswers / totalQuestions) * 100;

            const result = {
                exam: currentExam,
                date: new Date().toISOString(),
                score: score,
                correct: correctAnswers,
                incorrect: incorrectAnswers,
                unattempted: unattemptedAnswers,
                subjectStats: subjectStats,
                user: userData.email,
                answers: selectedAnswers
            };
            examResults.push(result);
            localStorage.setItem('examResults', JSON.stringify(examResults));

            examInterfaceSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');

            totalScoreElement.textContent = `${score.toFixed(2)}%`;
            correctAnswersElement.textContent = correctAnswers;
            incorrectAnswersElement.textContent = incorrectAnswers;
            unattemptedAnswersElement.textContent = unattemptedAnswers;

            renderResultChart(correctAnswers, incorrectAnswers, unattemptedAnswers);
            renderSubjectBreakdown(subjectStats);
            renderDetailedSolutions();
            renderSubjectPerformanceChart(subjectStats);

            const jsConfetti = new JSConfetti();
            jsConfetti.addConfetti();
        }, 1000);
    }

    // --- Render Result Chart ---
    function renderResultChart(correct, incorrect, unattempted) {
        const ctx = document.getElementById('result-chart').getContext('2d');
        if (window.resultChart) window.resultChart.destroy();
        window.resultChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Correct', 'Incorrect', 'Unattempted'],
                datasets: [{
                    data: [correct, incorrect, unattempted],
                    backgroundColor: ['#34d399', '#ef4444', '#6b7280'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Performance Analysis' }
                }
            }
        });
    }

    // --- Render Subject Breakdown ---
    function renderSubjectBreakdown(subjectStats) {
        subjectBreakdownList.innerHTML = '';
        Object.entries(subjectStats).forEach(([subject, stats]) => {
            const div = document.createElement('div');
            div.className = 'subject-item shadow-md';
            const percentage = (stats.correct / stats.total * 100).toFixed(1);
            div.innerHTML = `
                <h4 class="font-semibold">${subject}</h4>
                <p>Correct: ${stats.correct}/${stats.total}</p>
                <p>Accuracy: ${percentage}%</p>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            `;
            subjectBreakdownList.appendChild(div);
        });
    }

    // --- Render Detailed Solutions (index-based!) ---
    function renderDetailedSolutions() {
        solutionsList.innerHTML = '';
        examQuestions.forEach((question, i) => {
            const userAnswer = selectedAnswers[question.id];
            const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;
            const isUnattempted = userAnswer === undefined;

            const solutionDiv = document.createElement('div');
            solutionDiv.className = `solution-item ${isCorrect ? 'correct' : (isUnattempted ? '' : 'incorrect')}`;

            let statusText = isUnattempted ? 'Unattempted' : (isCorrect ? 'Correct' : 'Incorrect');
            let userAnswerText = isUnattempted ? 'Not attempted' : question.options[userAnswer];
            let correctAnswerText = question.options[question.correctAnswer];

            solutionDiv.innerHTML = `
                <h4 class="font-semibold">${question.subject}: Question ${i + 1}</h4>
                <p>${question.text}</p>
                <p class="mt-1">Status: <span class="font-medium">${statusText}</span></p>
                <p>Your Answer: ${userAnswerText}</p>
                <p>Correct Answer: ${correctAnswerText}</p>
                ${question.explanation ? `<div class="explanation"><p><strong>Explanation:</strong> ${question.explanation}</p></div>` : ''}
            `;
            solutionsList.appendChild(solutionDiv);
        });
    }

    // --- Render Subject Performance Chart ---
    function renderSubjectPerformanceChart(subjectStats) {
        const ctx = document.getElementById('subject-performance-chart').getContext('2d');
        if (window.subjectChart) window.subjectChart.destroy();
        const labels = Object.keys(subjectStats);
        const data = Object.values(subjectStats).map(stat => (stat.correct / stat.total * 100).toFixed(1));

        window.subjectChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Accuracy (%)',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Accuracy (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Subjects'
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Subject-wise Performance' }
                }
            }
        });
    }

    // --- Anti-Copy (Disable copy actions when taking exam) ---
    document.addEventListener('copy', (e) => {
        if (examInterfaceSection.classList.contains('hidden')) return;
        e.preventDefault();
        copyAttempts++;
        alert(`Copying is prohibited! Attempt ${copyAttempts}/${maxCopyAttempts}`);
        if (copyAttempts >= maxCopyAttempts) {
            alert('Too many copy attempts! Exam terminated.');
            submitExam();
        }
        window.getSelection().removeAllRanges();
    });

    // --- Back to Selection from Results ---
    backToSelectionFromResults.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        examSelectionSection.classList.remove('hidden');
        copyAttempts = 0;
        if (window.resultChart) window.resultChart.destroy();
        if (window.subjectChart) window.subjectChart.destroy();
    });

    // (Optional) Data validator - warns about missing/duplicate IDs but is not required for correct UI rendering
    function validateIDs(questions) {
        const ids = questions.map(q => q.id);
        const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
        const missingIds = [];
        for (let i = 1; i <= questions.length; i++) {
            if (!ids.includes(i)) missingIds.push(i);
        }
        if (duplicates.length) {
            alert('Duplicate question IDs: ' + duplicates.join(', '));
        }
        if (missingIds.length) {
            alert('Missing question IDs: ' + missingIds.join(', '));
        }
    }
});
