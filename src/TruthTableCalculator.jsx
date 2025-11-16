import React, { useState } from 'react';
import { Calculator, Lightbulb, Copy, Check } from 'lucide-react';

const TruthTableCalculator = () => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('result');
  const [copied, setCopied] = useState(false);

  const insertOperator = (op) => {
    setExpression(prev => prev + op);
  };

  // Parse expression to get sub-expressions in evaluation order
  const getSubExpressions = (expr) => {
    const variables = [...new Set(expr.match(/[A-Za-z]/g))].sort();
    const subExprs = [];
    const seen = new Set();
    
    // Recursive function to extract sub-expressions
    const extract = (str) => {
      str = str.trim();
      if (!str || seen.has(str)) return;
      
      // Skip if it's just a single variable (we'll add those separately at the end)
      if (variables.includes(str)) return;
      
      seen.add(str);
      
      // Remove outer parentheses if fully wrapped
      let cleaned = str;
      while (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        let depth = 0, isFullyWrapped = true;
        for (let i = 0; i < cleaned.length; i++) {
          if (cleaned[i] === '(') depth++;
          else if (cleaned[i] === ')') depth--;
          if (depth === 0 && i < cleaned.length - 1) {
            isFullyWrapped = false;
            break;
          }
        }
        if (isFullyWrapped) {
          cleaned = cleaned.substring(1, cleaned.length - 1).trim();
        } else break;
      }
      
      // Handle negation
      if (cleaned.startsWith('~')) {
        extract(cleaned.substring(1));
        if (!variables.includes(cleaned)) {
          subExprs.push(cleaned);
        }
        return;
      }
      
      // Find main operator
      let depth = 0, mainOpIdx = -1, lowestPrec = 999;
      const precedence = { '↔': 1, '→': 2, '∨': 3, '⊕': 3, '↓': 3, '∧': 4, '↑': 4 };
      
      for (let i = cleaned.length - 1; i >= 0; i--) {
        const ch = cleaned[i];
        if (ch === ')') depth++;
        else if (ch === '(') depth--;
        else if (depth === 0 && precedence[ch]) {
          if (precedence[ch] <= lowestPrec) {
            lowestPrec = precedence[ch];
            mainOpIdx = i;
          }
        }
      }
      
      if (mainOpIdx > 0) {
        const left = cleaned.substring(0, mainOpIdx).trim();
        const right = cleaned.substring(mainOpIdx + 1).trim();
        
        extract(left);
        extract(right);
        
        if (!variables.includes(cleaned)) {
          subExprs.push(cleaned);
        }
      } else if (!variables.includes(cleaned)) {
        subExprs.push(cleaned);
      }
    };
    
    extract(expr);
    
    // Add main expression at the end if not already there
    if (!subExprs.includes(expr)) {
      subExprs.push(expr);
    }
    
    return subExprs;
  };

  const evaluateExpression = (expr, values) => {
    // Create a working copy
    let evaluated = expr;
    
    // Replace variables with T/F, sorting by length to avoid partial replacements
    const sortedVars = Object.keys(values).sort((a, b) => b.length - a.length);
    sortedVars.forEach(variable => {
      // Use word boundary to avoid replacing part of longer variable names
      const regex = new RegExp('\\b' + variable + '\\b', 'g');
      evaluated = evaluated.replace(regex, values[variable] ? 'T' : 'F');
    });

    // Recursive evaluation function
    const evaluate = (str) => {
      str = str.trim();
      
      // Remove outer parentheses if fully wrapped
      while (str.startsWith('(') && str.endsWith(')')) {
        let depth = 0, isFullyWrapped = true;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') depth--;
          if (depth === 0 && i < str.length - 1) {
            isFullyWrapped = false;
            break;
          }
        }
        if (isFullyWrapped) {
          str = str.substring(1, str.length - 1).trim();
        } else break;
      }

      // Base cases
      if (str === 'T') return true;
      if (str === 'F') return false;

      // Handle negation
      if (str.startsWith('~')) {
        return !evaluate(str.substring(1));
      }

      // Find main operator (scan right to left, respecting precedence)
      let depth = 0;
      const precedence = { '↔': 1, '→': 2, '∨': 3, '⊕': 3, '↓': 3, '∧': 4, '↑': 4 };
      let mainOpIdx = -1;
      let lowestPrec = 999;

      for (let i = str.length - 1; i >= 0; i--) {
        const ch = str[i];
        if (ch === ')') depth++;
        else if (ch === '(') depth--;
        else if (depth === 0 && precedence[ch]) {
          if (precedence[ch] <= lowestPrec) {
            lowestPrec = precedence[ch];
            mainOpIdx = i;
          }
        }
      }

      if (mainOpIdx === -1) {
        // No operator found
        console.warn('No operator found in:', str);
        return str === 'T';
      }

      // Split and evaluate recursively
      const left = evaluate(str.substring(0, mainOpIdx));
      const right = evaluate(str.substring(mainOpIdx + 1));
      const op = str[mainOpIdx];

      // Apply operator
      switch (op) {
        case '∧': return left && right;
        case '∨': return left || right;
        case '→': return !left || right;
        case '↔': return left === right;
        case '⊕': return left !== right;
        case '↑': return !(left && right);
        case '↓': return !(left || right);
        default:
          console.warn('Unknown operator:', op);
          return false;
      }
    };

    try {
      const result = evaluate(evaluated);
      return result ? 1 : 0;
    } catch (error) {
      console.error('Evaluation error:', error, 'for:', evaluated);
      return 0;
    }
  };

  const generateTruthTable = () => {
    if (!expression.trim()) return;

    const variables = [...new Set(expression.match(/[A-Za-z]/g))].sort();
    
    if (variables.length === 0) {
      alert('Masukkan variabel (A-Z) dalam ekspresi!');
      return;
    }

    const subExpressions = getSubExpressions(expression);
    const numRows = Math.pow(2, variables.length);
    const table = [];
    const steps = [];

    for (let i = 0; i < numRows; i++) {
      const row = { values: {}, subResults: {} };
      // Reverse the binary order: start from all 1s (True) to all 0s (False)
      const binary = (numRows - 1 - i).toString(2).padStart(variables.length, '0');
      
      variables.forEach((v, idx) => {
        row.values[v] = binary[idx] === '1';
      });

      // Evaluate each sub-expression
      subExpressions.forEach(subExpr => {
        row.subResults[subExpr] = evaluateExpression(subExpr, row.values);
      });

      const resultValue = evaluateExpression(expression, row.values);
      row.result = resultValue;
      
      // Generate step explanation
      const stepExplanation = `Baris ${i + 1}: ${variables.map(v => `${v}=${row.values[v] ? 'B' : 'S'}`).join(', ')} → Hasil = ${resultValue ? 'B' : 'S'}`;
      steps.push(stepExplanation);
      
      table.push(row);
    }

    setResult({ variables, subExpressions, table, steps, expression });
  };

  const copyTable = () => {
    if (!result) return;
    
    let text = result.variables.join('\t') + '\t' + result.subExpressions.join('\t') + '\n';
    result.table.forEach(row => {
      text += result.variables.map(v => row.values[v] ? 'B' : 'S').join('\t') + '\t';
      text += result.subExpressions.map(expr => row.subResults[expr] ? 'B' : 'S').join('\t') + '\n';
    });
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCNF = () => {
    if (!result) return { formula: '', terms: [], isValid: false };
    const falseRows = result.table.filter(row => row.result === 0);
    if (falseRows.length === 0) return { formula: 'Tautologi (selalu benar)', terms: [], isValid: false };
    
    const cnfTerms = falseRows.map(row => {
      const terms = result.variables.map(v => row.values[v] ? `~${v}` : v);
      return `(${terms.join('∨')})`;
    });
    
    return { 
      formula: `${cnfTerms.join('∧')}`,
      terms: cnfTerms,
      isValid: true
    };
  };

  const getDNF = () => {
    if (!result) return { formula: '', terms: [], isValid: false };
    const trueRows = result.table.filter(row => row.result === 1);
    if (trueRows.length === 0) return { formula: 'Kontradiksi (selalu salah)', terms: [], isValid: false };
    
    const dnfTerms = trueRows.map(row => {
      const terms = result.variables.map(v => row.values[v] ? v : `~${v}`);
      return `(${terms.join('∧')})`;
    });
    
    return { 
      formula: `${dnfTerms.join('∨')}`,
      terms: dnfTerms,
      isValid: true
    };
  };

  const evaluateCNFTerm = (term, row) => {
    // Remove parentheses
    const cleanTerm = term.replace(/[()]/g, '');
    const literals = cleanTerm.split('∨');
    
    // Evaluate OR of literals
    return literals.some(lit => {
      const isNegated = lit.trim().startsWith('~');
      const variable = isNegated ? lit.trim().substring(1) : lit.trim();
      const value = row.values[variable];
      return isNegated ? !value : value;
    });
  };

  const evaluateDNFTerm = (term, row) => {
    // Remove parentheses
    const cleanTerm = term.replace(/[()]/g, '');
    const literals = cleanTerm.split('∧');
    
    // Evaluate AND of literals
    return literals.every(lit => {
      const isNegated = lit.trim().startsWith('~');
      const variable = isNegated ? lit.trim().substring(1) : lit.trim();
      const value = row.values[variable];
      return isNegated ? !value : value;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-yellow-950 p-4">
      <div className="lg:max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Calculator className="w-10 h-10 text-yellow-400" style={{filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.5))'}} />
            <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-yellow-400" 
                style={{textShadow: '0 0 20px rgba(96, 165, 250, 0.3)'}}>
              Truth Table Calculator
            </h1>
          </div>
          <p className="text-blue-200 text-sm">Kalkulator Tabel Kebenaran Logika dengan Langkah Penyelesaian</p>
        </div>

        {/* Input Section */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-blue-500/30 shadow-lg shadow-blue-500/20">
          <label className="block text-blue-300 mb-3 font-semibold">Masukkan Ekspresi Logika:</label>
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Contoh: P⊕Q→P∨Q∧R"
            className="w-full bg-slate-900/70 text-white px-4 py-3 rounded-lg border-2 border-blue-500/50 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all placeholder-slate-500"
            style={{boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'}}
          />
          
          {/* Operator Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'NEGASI (~)', value: '~' },
              { label: 'AND (∧)', value: '∧' },
              { label: 'OR (∨)', value: '∨' },
              { label: 'IF (↔)', value: '↔' },
              { label: 'IF THEN (→)', value: '→' },
              { label: 'NAND (↑)', value: '↑' },
              { label: 'NOR (↓)', value: '↓' },
              { label: 'XOR (⊕)', value: '⊕' },
            ].map((op) => (
              <button
                key={op.value}
                onClick={() => insertOperator(op.value)}
                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-2 px-3 rounded-lg transition-all font-medium text-sm border border-blue-400/30"
                style={{boxShadow: '0 0 10px rgba(37, 99, 235, 0.3)'}}
              >
                {op.label}
              </button>
            ))}
          </div>

          <button
            onClick={generateTruthTable}
            className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 py-3 px-6 rounded-lg font-bold transition-all shadow-lg"
            style={{boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)'}}
          >
            <Calculator className="inline w-5 h-5 mr-2" />
            Hitung Tabel Kebenaran
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30 shadow-lg shadow-yellow-500/20">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-700">
              {['result', 'cnf-dnf', 'steps'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium transition-all ${
                    activeTab === tab
                      ? 'text-yellow-400 border-b-2 border-yellow-400'
                      : 'text-slate-400 hover:text-blue-300'
                  }`}
                >
                  {tab === 'result' && 'Hasil'}
                  {tab === 'cnf-dnf' && 'CNF & DNF'}
                  {tab === 'steps' && 'Langkah-Langkah'}
                </button>
              ))}
            </div>

            {/* Result Tab */}
            {activeTab === 'result' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-blue-300">Tabel Kebenaran</h3>
                    <p className="text-sm text-yellow-300 mt-1">i: {result.expression}</p>
                  </div>
                  <button
                    onClick={copyTable}
                    className="flex items-center gap-2 bg-blue-600/50 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all text-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                        {result.variables.map((v) => (
                          <th key={v} className="border border-blue-500/50 px-3 py-2 text-yellow-300 font-bold">{v}</th>
                        ))}
                        {result.subExpressions.map((expr, idx) => (
                          <th key={idx} className="border border-blue-500/50 px-3 py-2 text-yellow-300 font-bold bg-blue-700/50">
                            {expr}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.table.map((row, idx) => (
                        <tr key={idx} className="bg-slate-900/50 hover:bg-slate-800/70 transition-colors">
                          {result.variables.map((v) => (
                            <td key={v} className="border border-slate-700 px-3 py-2 text-center text-blue-200 font-medium">
                              {row.values[v] ? 'B' : 'S'}
                            </td>
                          ))}
                          {result.subExpressions.map((expr, idx) => {
                            const isLast = idx === result.subExpressions.length - 1;
                            const value = row.subResults[expr];
                            return (
                              <td 
                                key={idx} 
                                className={`border border-slate-700 px-3 py-2 text-center font-bold ${
                                  isLast 
                                    ? (value ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20')
                                    : (value ? 'text-green-400' : 'text-red-400')
                                }`}
                              >
                                {value ? 'B' : 'S'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-xs text-slate-400">
                  <p>B = Benar (True/1) | S = Salah (False/0)</p>
                </div>
              </div>
            )}

            {/* CNF & DNF Tab */}
            {activeTab === 'cnf-dnf' && (
              <div className="space-y-6">
                {/* CNF Section */}
                <div className="bg-slate-900/70 p-5 rounded-lg border border-purple-500/30">
                  <h4 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <span className="bg-purple-500/20 px-2 py-1 rounded">CNF</span>
                    Conjunctive Normal Form
                  </h4>
                  <div className="bg-slate-800/50 p-4 rounded border border-purple-500/20 mb-4">
                    <p className="text-sm text-slate-400 mb-1">Hasil CNF:</p>
                    <p className="text-blue-100 font-mono text-base break-all leading-relaxed">
                      {getCNF().formula}
                    </p>
                  </div>
                  
                  {getCNF().isValid && (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-purple-300 mb-2 font-semibold">Tabel Uraian CNF:</p>
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-600 to-purple-700">
                            {result.variables.map((v) => (
                              <th key={v} className="border border-purple-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap">{v}</th>
                            ))}
                            {result.variables.map((v) => (
                              <th key={`neg-${v}`} className="border border-purple-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-purple-700/50">~{v}</th>
                            ))}
                            {getCNF().terms.map((term, idx) => (
                              <th key={idx} className="border border-purple-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-purple-800/50">
                                {term}
                              </th>
                            ))}
                            <th className="border border-purple-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-purple-900/70">
                              {getCNF().formula}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.table.map((row, idx) => (
                            <tr key={idx} className="bg-slate-900/50 hover:bg-slate-800/70 transition-colors">
                              {result.variables.map((v) => (
                                <td key={v} className="border border-slate-700 px-3 py-2 text-center text-blue-200 font-medium">
                                  {row.values[v] ? 'B' : 'S'}
                                </td>
                              ))}
                              {result.variables.map((v) => (
                                <td key={`neg-${v}`} className="border border-slate-700 px-3 py-2 text-center font-medium bg-slate-800/30">
                                  <span className={row.values[v] ? 'text-red-400' : 'text-green-400'}>
                                    {row.values[v] ? 'S' : 'B'}
                                  </span>
                                </td>
                              ))}
                              {getCNF().terms.map((term, termIdx) => {
                                const value = evaluateCNFTerm(term, row);
                                return (
                                  <td key={termIdx} className="border border-slate-700 px-3 py-2 text-center font-bold">
                                    <span className={value ? 'text-green-400' : 'text-red-400'}>
                                      {value ? 'B' : 'S'}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="border border-slate-700 px-3 py-2 text-center font-bold">
                                <span className={getCNF().terms.every(term => evaluateCNFTerm(term, row)) ? 'text-green-400' : 'text-red-400'}>
                                  {getCNF().terms.every(term => evaluateCNFTerm(term, row)) ? 'B' : 'S'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <p className="text-slate-400 text-xs mt-3">
                    📌 Bentuk konjungsi dari disjungsi (AND dari OR) - diambil dari baris yang bernilai SALAH
                  </p>
                </div>
                
                {/* DNF Section */}
                <div className="bg-slate-900/70 p-5 rounded-lg border border-green-500/30">
                  <h4 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                    <span className="bg-green-500/20 px-2 py-1 rounded">DNF</span>
                    Disjunctive Normal Form
                  </h4>
                  <div className="bg-slate-800/50 p-4 rounded border border-green-500/20 mb-4">
                    <p className="text-sm text-slate-400 mb-1">Hasil DNF:</p>
                    <p className="text-blue-100 font-mono text-base break-all leading-relaxed">
                      {getDNF().formula}
                    </p>
                  </div>
                  
                  {getDNF().isValid && (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-green-300 mb-2 font-semibold">Tabel Uraian DNF:</p>
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-green-600 to-green-700">
                            {result.variables.map((v) => (
                              <th key={v} className="border border-green-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap">{v}</th>
                            ))}
                            {result.variables.map((v) => (
                              <th key={`neg-${v}`} className="border border-green-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-green-700/50">~{v}</th>
                            ))}
                            {getDNF().terms.map((term, idx) => (
                              <th key={idx} className="border border-green-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-green-800/50">
                                {term}
                              </th>
                            ))}
                            <th className="border border-green-500/50 px-3 py-2 text-yellow-300 font-bold whitespace-nowrap bg-green-900/70">
                              {getDNF().formula}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.table.map((row, idx) => (
                            <tr key={idx} className="bg-slate-900/50 hover:bg-slate-800/70 transition-colors">
                              {result.variables.map((v) => (
                                <td key={v} className="border border-slate-700 px-3 py-2 text-center text-blue-200 font-medium">
                                  {row.values[v] ? 'B' : 'S'}
                                </td>
                              ))}
                              {result.variables.map((v) => (
                                <td key={`neg-${v}`} className="border border-slate-700 px-3 py-2 text-center font-medium bg-slate-800/30">
                                  <span className={row.values[v] ? 'text-red-400' : 'text-green-400'}>
                                    {row.values[v] ? 'S' : 'B'}
                                  </span>
                                </td>
                              ))}
                              {getDNF().terms.map((term, termIdx) => {
                                const value = evaluateDNFTerm(term, row);
                                return (
                                  <td key={termIdx} className="border border-slate-700 px-3 py-2 text-center font-bold">
                                    <span className={value ? 'text-green-400' : 'text-red-400'}>
                                      {value ? 'B' : 'S'}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="border border-slate-700 px-3 py-2 text-center font-bold">
                                <span className={getDNF().terms.some(term => evaluateDNFTerm(term, row)) ? 'text-green-400' : 'text-red-400'}>
                                  {getDNF().terms.some(term => evaluateDNFTerm(term, row)) ? 'B' : 'S'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <p className="text-slate-400 text-xs mt-3">
                    📌 Bentuk disjungsi dari konjungsi (OR dari AND) - diambil dari baris yang bernilai BENAR
                  </p>
                </div>

                <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                  <h5 className="text-blue-300 font-semibold mb-2">💡 Catatan:</h5>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• DNF: Ambil baris dengan hasil BENAR (B), gunakan variabel asli untuk B dan negasi (~) untuk S</li>
                    <li>• CNF: Ambil baris dengan hasil SALAH (S), gunakan variabel asli untuk S dan negasi (~) untuk B</li>
                    <li>• Tabel dapat di-scroll horizontal untuk melihat semua kolom uraian</li>
                    <li>• Operator: ∧ = AND, ∨ = OR, ~ = NOT</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Steps Tab */}
            {activeTab === 'steps' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-blue-300">Langkah-Langkah Penyelesaian</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-900/70 p-4 rounded-lg border border-blue-500/30">
                    <p className="text-blue-200 font-semibold mb-2">📝 Ekspresi: <span className="text-yellow-300 font-mono">{result.expression}</span></p>
                    <p className="text-blue-200">🔤 Variabel: <span className="text-yellow-300">{result.variables.join(', ')}</span></p>
                    <p className="text-blue-200">🔢 Jumlah kombinasi: <span className="text-yellow-300">{result.table.length} baris</span></p>
                    <p className="text-blue-200 mt-2">📊 Sub-ekspresi yang dievaluasi:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.subExpressions.map((expr, idx) => (
                        <span key={idx} className="bg-blue-600/30 px-2 py-1 rounded text-xs text-blue-200 font-mono border border-blue-500/30">
                          {expr}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/70 p-4 rounded-lg border border-yellow-500/30">
                    <h4 className="text-yellow-300 font-semibold mb-2">🎯 Evaluasi Setiap Baris:</h4>
                    {result.steps.map((step, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-3 rounded-lg border-l-4 border-yellow-400/50 mb-2">
                        <p className="text-blue-100 text-sm">{step}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/30">
                    <h5 className="text-green-300 font-semibold mb-2">✅ Kesimpulan:</h5>
                    <p className="text-sm text-green-200">
                      Tabel kebenaran berhasil dibuat dengan {result.table.length} kombinasi nilai. 
                      Setiap kolom menunjukkan evaluasi bertahap dari sub-ekspresi hingga hasil akhir.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-slate-400 text-sm pb-8">
          <p>© Truth Table Calculator 2025 | INSA AKSAR RABBANI</p>
          <p className="mt-1 text-blue-300/70">POLITEKNIK MARDIRA INDONESIA</p>
        </div>
      </div>
    </div>
  );
};

export default TruthTableCalculator;