(() => {
    // DOM Elements
    const expressionDisplay = document.getElementById('expressionDisplay');
    const resultDisplay = document.getElementById('resultDisplay');
    const scientificPad = document.getElementById('scientificPad');
    const modeBasicBtn = document.getElementById('modeBasic');
    const modeSciBtn = document.getElementById('modeSci');
    const angleToggleBtn = document.getElementById('angleToggle');
    const angleIndicator = document.getElementById('angleIndicator');
    const memoryIndicator = document.getElementById('memoryIndicator');
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const copyBtn = document.getElementById('copyBtn');
    const copyText = document.getElementById('copyText');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Converter Elements
    const convCategory = document.getElementById('convCategory');
    const convInput = document.getElementById('convInput');
    const convFrom = document.getElementById('convFrom');
    const convTo = document.getElementById('convTo');
    const convOutput = document.getElementById('convOutput');
    const convSwapBtn = document.getElementById('convSwapBtn');
    const sendToCalcBtn = document.getElementById('sendToCalcBtn');

    // State
    let expression = '';
    let currentResult = '0';
    let lastAnswer = 0;
    let memoryValue = 0;
    let hasMemory = false;
    let isDegree = true;
    let justCalculated = false;
    let history = JSON.parse(localStorage.getItem('calc_history') || '[]');

    // Format number cleanly (avoid floating point precision artifacts like 0.30000000000000004)
    function formatNumber(num) {
        if (!Number.isFinite(num)) {
            return 'Lỗi toán học';
        }
        if (Object.is(num, -0)) num = 0;
        const abs = Math.abs(num);
        if (abs !== 0 && (abs >= 1e12 || abs < 1e-7)) {
            return num.toExponential(6).replace(/\.?0+e/, 'e');
        }
        const rounded = Number(Math.round(num + 'e12') + 'e-12');
        return rounded.toString();
    }

    function factorial(n) {
        if (n < 0 || !Number.isInteger(n)) return NaN;
        if (n > 170) return Infinity;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    // Evaluate mathematical expression safely
    function evaluateExpression(rawExpr) {
        if (!rawExpr.trim()) return 0;

        let expr = rawExpr
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-');

        // Auto-close unclosed parentheses
        const openCount = (expr.match(/\(/g) || []).length;
        const closeCount = (expr.match(/\)/g) || []).length;
        if (openCount > closeCount) {
            expr += ')'.repeat(openCount - closeCount);
        }

        // Insert implicit multiplication: e.g., 2π, 2(3), (2)(3), π(2)
        expr = expr
            .replace(/(\d|\)|π|e)(?=(π|e|\(|sin|cos|tan|log|ln|sqrt|abs))/g, '$1*')
            .replace(/(π|e|\))(?=\d)/g, '$1*');

        // Replace constants and functions
        expr = expr
            .replace(/π/g, 'Math.PI')
            .replace(/\be\b/g, 'Math.E')
            .replace(/\bsin\(/g, '__sin(')
            .replace(/\bcos\(/g, '__cos(')
            .replace(/\btan\(/g, '__tan(')
            .replace(/\blog\(/g, 'Math.log10(')
            .replace(/\bln\(/g, 'Math.log(')
            .replace(/\bsqrt\(/g, 'Math.sqrt(')
            .replace(/\babs\(/g, 'Math.abs(')
            .replace(/\^/g, '**');

        const toRad = (val) => (isDegree ? (val * Math.PI) / 180 : val);
        const __sin = (x) => {
            if (isDegree && Number.isInteger(x / 180)) return 0;
            return Math.sin(toRad(x));
        };
        const __cos = (x) => {
            if (isDegree && Number.isInteger((x - 90) / 180)) return 0;
            return Math.cos(toRad(x));
        };
        const __tan = (x) => {
            if (isDegree && Number.isInteger((x - 90) / 180)) return NaN;
            if (isDegree && Number.isInteger(x / 180)) return 0;
            return Math.tan(toRad(x));
        };

        // Validate only safe characters/tokens remain
        const fn = new Function('__sin', '__cos', '__tan', `return (${expr});`);
        return fn(__sin, __cos, __tan);
    }

    function updateDisplay() {
        expressionDisplay.textContent = expression;
        resultDisplay.textContent = currentResult;

        // Live preview when typing an expression
        if (!justCalculated && expression) {
            try {
                const val = evaluateExpression(expression);
                if (Number.isFinite(val)) {
                    resultDisplay.textContent = formatNumber(val);
                }
            } catch {
                // Keep previous valid result while user is mid-typing an operator
            }
        }
    }

    function insertToken(token) {
        const isOperator = ['+', '-', '×', '÷', '^'].includes(token);

        if (justCalculated) {
            if (isOperator) {
                expression = currentResult === 'Lỗi toán học' ? '' : currentResult;
            } else {
                expression = '';
            }
            justCalculated = false;
        }

        // Prevent duplicate operators at the end
        if (isOperator && expression.length > 0) {
            const lastChar = expression.slice(-1);
            if (['+', '-', '×', '÷', '^'].includes(lastChar)) {
                expression = expression.slice(0, -1) + token;
                updateDisplay();
                return;
            }
        }

        // Prevent multiple decimals in the same number segment
        if (token === '.') {
            const parts = expression.split(/[+\-×÷^()]/);
            const currentSegment = parts[parts.length - 1];
            if (currentSegment.includes('.')) return;
            if (currentSegment === '') {
                expression += '0.';
                updateDisplay();
                return;
            }
        }

        expression += token;
        updateDisplay();
    }

    function clearAll() {
        expression = '';
        currentResult = '0';
        justCalculated = false;
        updateDisplay();
    }

    function backspace() {
        if (justCalculated) {
            justCalculated = false;
            return;
        }
        // Remove multi-character function names as a single unit
        const funcMatch = expression.match(/(sin\(|cos\(|tan\(|log\(|ln\(|sqrt\(|abs\()$/);
        if (funcMatch) {
            expression = expression.slice(0, -funcMatch[0].length);
        } else {
            expression = expression.slice(0, -1);
        }
        if (!expression) {
            currentResult = '0';
        }
        updateDisplay();
    }

    function calculate() {
        if (!expression) return;
        try {
            const rawVal = evaluateExpression(expression);
            const formatted = formatNumber(rawVal);

            // Auto-close parentheses for display clarity
            const openCount = (expression.match(/\(/g) || []).length;
            const closeCount = (expression.match(/\)/g) || []).length;
            const finalExpr = openCount > closeCount
                ? expression + ')'.repeat(openCount - closeCount)
                : expression;

            if (formatted !== 'Lỗi toán học') {
                lastAnswer = Number(formatted);
                addHistory(finalExpr, formatted);
            }

            expressionDisplay.textContent = `${finalExpr} =`;
            currentResult = formatted;
            resultDisplay.textContent = currentResult;
            justCalculated = true;
        } catch {
            currentResult = 'Lỗi cú pháp';
            resultDisplay.textContent = currentResult;
            justCalculated = true;
        }
    }

    function applyUnaryAction(action) {
        try {
            const baseVal = expression ? evaluateExpression(expression) : Number(currentResult);
            if (!Number.isFinite(baseVal)) return;

            let newVal = baseVal;
            let label = '';

            if (action === 'percent') {
                newVal = baseVal / 100;
                label = `(${expression || baseVal})%`;
            } else if (action === 'negate') {
                newVal = -baseVal;
                label = `-(${expression || baseVal})`;
            } else if (action === 'square') {
                newVal = baseVal * baseVal;
                label = `(${expression || baseVal})²`;
            } else if (action === 'reciprocal') {
                newVal = 1 / baseVal;
                label = `1/(${expression || baseVal})`;
            } else if (action === 'factorial') {
                newVal = factorial(baseVal);
                label = `(${expression || baseVal})!`;
            }

            const formatted = formatNumber(newVal);
            if (formatted !== 'Lỗi toán học') {
                lastAnswer = Number(formatted);
                addHistory(label, formatted);
            }
            expression = formatted === 'Lỗi toán học' ? '' : formatted;
            currentResult = formatted;
            expressionDisplay.textContent = `${label} =`;
            resultDisplay.textContent = currentResult;
            justCalculated = true;
        } catch {
            currentResult = 'Lỗi cú pháp';
            resultDisplay.textContent = currentResult;
        }
    }

    function handleMemory(action) {
        const currentVal = Number(resultDisplay.textContent);
        if (action === 'mc') {
            memoryValue = 0;
            hasMemory = false;
        } else if (action === 'mr') {
            if (hasMemory) {
                insertToken(formatNumber(memoryValue));
            }
        } else if (action === 'm-plus' && Number.isFinite(currentVal)) {
            memoryValue += currentVal;
            hasMemory = true;
        } else if (action === 'm-minus' && Number.isFinite(currentVal)) {
            memoryValue -= currentVal;
            hasMemory = true;
        } else if (action === 'ans') {
            insertToken(formatNumber(lastAnswer));
        }
        memoryIndicator.classList.toggle('hidden', !hasMemory);
    }

    // History Management
    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = 'Chưa có phép tính nào. Hãy thử tính một biểu thức!';
            historyList.appendChild(empty);
            return;
        }

        history.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.title = 'Nhấn để dùng lại kết quả này';
            li.innerHTML = `
                <div class="history-expr">${item.expr} =</div>
                <div class="history-res">${item.result}</div>
            `;
            li.addEventListener('click', () => {
                expression = item.result;
                currentResult = item.result;
                justCalculated = false;
                updateDisplay();
            });
            historyList.appendChild(li);
        });
    }

    function addHistory(expr, result) {
        history.unshift({ expr, result });
        if (history.length > 30) history.pop();
        localStorage.setItem('calc_history', JSON.stringify(history));
        renderHistory();
    }

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });

    // Keypad Event Listeners
    document.querySelectorAll('.calc-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const token = btn.dataset.insert;
            const action = btn.dataset.action;

            if (token !== undefined) {
                insertToken(token);
            } else if (action === 'clear') {
                clearAll();
            } else if (action === 'backspace') {
                backspace();
            } else if (action === 'calculate') {
                calculate();
            } else if (['percent', 'negate', 'square', 'reciprocal', 'factorial'].includes(action)) {
                applyUnaryAction(action);
            }
        });
    });

    document.querySelectorAll('.mem-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleMemory(btn.dataset.action));
    });

    // Mode Switching (Basic vs Scientific)
    function setMode(mode) {
        const isSci = mode === 'scientific';
        scientificPad.classList.toggle('hidden', !isSci);
        angleToggleBtn.classList.toggle('hidden', !isSci);
        modeBasicBtn.classList.toggle('active', !isSci);
        modeSciBtn.classList.toggle('active', isSci);
    }

    modeBasicBtn.addEventListener('click', () => setMode('basic'));
    modeSciBtn.addEventListener('click', () => setMode('scientific'));

    // Angle Unit Toggle (DEG / RAD)
    angleToggleBtn.addEventListener('click', () => {
        isDegree = !isDegree;
        const label = isDegree ? 'DEG' : 'RAD';
        angleToggleBtn.textContent = label;
        angleIndicator.textContent = label;
        updateDisplay();
    });

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        const root = document.documentElement;
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', nextTheme);
        themeIcon.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    });

    // Copy Result
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(resultDisplay.textContent);
            copyText.textContent = 'Đã chép ✓';
            setTimeout(() => {
                copyText.textContent = 'Sao chép';
            }, 1500);
        } catch {
            copyText.textContent = 'Lỗi';
        }
    });

    // Side Panel Tabs
    document.querySelectorAll('.side-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.side-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
        });
    });

    // Quick Unit Converter
    const unitDefinitions = {
        length: {
            units: {
                m: { label: 'Mét (m)', factor: 1 },
                km: { label: 'Kilômét (km)', factor: 1000 },
                cm: { label: 'Centimét (cm)', factor: 0.01 },
                mm: { label: 'Milimét (mm)', factor: 0.001 },
                inch: { label: 'Inch (in)', factor: 0.0254 },
                ft: { label: 'Feet (ft)', factor: 0.3048 }
            },
            defaultFrom: 'm',
            defaultTo: 'cm'
        },
        weight: {
            units: {
                kg: { label: 'Kilôgam (kg)', factor: 1 },
                g: { label: 'Gam (g)', factor: 0.001 },
                lb: { label: 'Pound (lb)', factor: 0.45359237 },
                oz: { label: 'Ounce (oz)', factor: 0.02834952 }
            },
            defaultFrom: 'kg',
            defaultTo: 'g'
        },
        temperature: {
            units: {
                C: { label: 'Độ C (°C)' },
                F: { label: 'Độ F (°F)' },
                K: { label: 'Kelvin (K)' }
            },
            defaultFrom: 'C',
            defaultTo: 'F'
        },
        data: {
            units: {
                KB: { label: 'Kilobyte (KB)', factor: 1 },
                MB: { label: 'Megabyte (MB)', factor: 1024 },
                GB: { label: 'Gigabyte (GB)', factor: 1048576 },
                TB: { label: 'Terabyte (TB)', factor: 1073741824 }
            },
            defaultFrom: 'GB',
            defaultTo: 'MB'
        }
    };

    function populateConverterUnits() {
        const cat = convCategory.value;
        const def = unitDefinitions[cat];
        convFrom.innerHTML = '';
        convTo.innerHTML = '';

        Object.entries(def.units).forEach(([key, info]) => {
            convFrom.add(new Option(info.label, key));
            convTo.add(new Option(info.label, key));
        });

        convFrom.value = def.defaultFrom;
        convTo.value = def.defaultTo;
        runConversion();
    }

    function runConversion() {
        const cat = convCategory.value;
        const val = parseFloat(convInput.value);
        if (Number.isNaN(val)) {
            convOutput.value = '';
            return;
        }

        const from = convFrom.value;
        const to = convTo.value;
        let out = val;

        if (cat === 'temperature') {
            let celsius = val;
            if (from === 'F') celsius = ((val - 32) * 5) / 9;
            if (from === 'K') celsius = val - 273.15;

            if (to === 'C') out = celsius;
            if (to === 'F') out = (celsius * 9) / 5 + 32;
            if (to === 'K') out = celsius + 273.15;
        } else {
            const units = unitDefinitions[cat].units;
            const base = val * units[from].factor;
            out = base / units[to].factor;
        }

        convOutput.value = formatNumber(out);
    }

    convCategory.addEventListener('change', populateConverterUnits);
    convInput.addEventListener('input', runConversion);
    convFrom.addEventListener('change', runConversion);
    convTo.addEventListener('change', runConversion);

    convSwapBtn.addEventListener('click', () => {
        const temp = convFrom.value;
        convFrom.value = convTo.value;
        convTo.value = temp;
        runConversion();
    });

    sendToCalcBtn.addEventListener('click', () => {
        if (convOutput.value && convOutput.value !== 'Lỗi toán học') {
            expression = convOutput.value;
            currentResult = convOutput.value;
            justCalculated = false;
            updateDisplay();
        }
    });

    // Keyboard Support
    window.addEventListener('keydown', (e) => {
        if (document.activeElement === convInput || document.activeElement === convCategory) {
            return;
        }

        const key = e.key;
        if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            insertToken(key);
        } else if (key === '.' || key === ',') {
            e.preventDefault();
            insertToken('.');
        } else if (key === '+') {
            e.preventDefault();
            insertToken('+');
        } else if (key === '-') {
            e.preventDefault();
            insertToken('-');
        } else if (key === '*') {
            e.preventDefault();
            insertToken('×');
        } else if (key === '/') {
            e.preventDefault();
            insertToken('÷');
        } else if (key === '^') {
            e.preventDefault();
            insertToken('^');
        } else if (key === '(' || key === ')') {
            e.preventDefault();
            insertToken(key);
        } else if (key === '%') {
            e.preventDefault();
            applyUnaryAction('percent');
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            calculate();
        } else if (key === 'Backspace') {
            e.preventDefault();
            backspace();
        } else if (key === 'Escape') {
            e.preventDefault();
            clearAll();
        }
    });

    // Initialize
    renderHistory();
    populateConverterUnits();
    updateDisplay();
})();
