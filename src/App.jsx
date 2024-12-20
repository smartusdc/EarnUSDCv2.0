// src/App.jsx
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Wallet, Clipboard } from 'lucide-react';

const CONTRACT_ADDRESS = '0x9cf81A1814D452D4f5308aA38D128ce5CAADdDE4';
const CONTRACT_ABI = [
  {"inputs":[],"name":"generateReferralCode","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"referralCode","type":"uint256"}],"name":"depositFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deposits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"currentAPR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"requestWithdrawal","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimDepositReward","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

function App() {
  const [state, setState] = useState({
    account: '',
    balance: '0',
    apr: '0',
    referralCode: '',
    depositAmount: '',
    withdrawAmount: '',
    inputReferralCode: '',
    activeTab: 'deposit',
    withdrawRequested: false
  });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      setContract(new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS));
      
      web3Instance.eth.getAccounts().then(accounts => {
        if (accounts.length > 0) connectWallet();
      });
    }
  }, []);

  const showAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'info' }), 5000);
  };

  const updateState = newState => setState(prev => ({ ...prev, ...newState }));

  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const code = await contract.methods.generateReferralCode().call({ from: accounts[0] });
      const [balance, apr] = await Promise.all([
        contract.methods.deposits(accounts[0]).call(),
        contract.methods.currentAPR().call()
      ]);

      updateState({
        account: accounts[0],
        referralCode: code,
        balance: (balance / 1e6).toFixed(2),
        apr
      });
      
      showAlert('ウォレットを接続しました', 'success');
    } catch (error) {
      showAlert('ウォレット接続に失敗しました', 'error');
    }
  };

  const handleTransaction = async (action) => {
    if (!contract) return;
    
    try {
      const { account, depositAmount, withdrawAmount, inputReferralCode } = state;
      switch (action) {
        case 'deposit':
          await contract.methods.depositFunds(
            web3.utils.toWei(depositAmount, 'mwei'), 
            inputReferralCode || '0'
          ).send({ from: account });
          updateState({ depositAmount: '' });
          break;
        case 'requestWithdraw':
          await contract.methods.requestWithdrawal(
            web3.utils.toWei(withdrawAmount, 'mwei')
          ).send({ from: account });
          updateState({ withdrawAmount: '', withdrawRequested: true });
          break;
        case 'withdraw':
          await contract.methods.withdraw().send({ from: account });
          updateState({ withdrawRequested: false });
          break;
        case 'claim':
          await contract.methods.claimDepositReward().send({ from: account });
          break;
      }
      
      // Refresh balance after transaction
      const newBalance = await contract.methods.deposits(account).call();
      updateState({ balance: (newBalance / 1e6).toFixed(2) });
      showAlert('取引が完了しました', 'success');
    } catch (error) {
      showAlert('取引に失敗しました', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-1">EarnUSDC on Base</h1>
          
          {alert.show && (
            <div className={`mb-4 p-4 rounded-lg ${
              alert.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {alert.message}
            </div>
          )}

          {!state.account ? (
            <button onClick={connectWallet} className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center justify-center">
              <Wallet className="w-4 h-4 mr-2" />
              ウォレットを接続
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">預入残高</div>
                  <div className="text-2xl font-bold">{state.balance} USDC</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">現在のAPR</div>
                  <div className="text-2xl font-bold">{state.apr}%</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500">リファラルコード</div>
                  <div className="text-xl font-mono">{state.referralCode}</div>
                </div>
                <button onClick={() => {
                  navigator.clipboard.writeText(state.referralCode);
                  showAlert('コピーしました');
                }} className="p-2 hover:bg-gray-200 rounded">
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                {['deposit', 'withdraw'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => updateState({ activeTab: tab })}
                    className={`px-4 py-2 font-medium rounded ${
                      state.activeTab === tab ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
                    }`}
                  >
                    {tab === 'deposit' ? '預け入れ' : '引き出し'}
                  </button>
                ))}
              </div>

              {state.activeTab === 'deposit' ? (
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="預入額 (USDC)"
                    className="w-full p-2 border rounded"
                    value={state.depositAmount}
                    onChange={e => updateState({ depositAmount: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="リファラルコード (オプション)"
                    className="w-full p-2 border rounded"
                    value={state.inputReferralCode}
                    onChange={e => updateState({ inputReferralCode: e.target.value })}
                  />
                  <button 
                    onClick={() => handleTransaction('deposit')} 
                    className="w-full bg-blue-500 text-white rounded-lg px-4 py-2"
                  >
                    預け入れ
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.withdrawRequested ? (
                    <button 
                      onClick={() => handleTransaction('withdraw')}
                      className="w-full bg-blue-500 text-white rounded-lg px-4 py-2"
                    >
                      引き出しを実行
                    </button>
                  ) : (
                    <>
                      <input
                        type="number"
                        placeholder="引出額 (USDC)"
                        className="w-full p-2 border rounded"
                        value={state.withdrawAmount}
                        onChange={e => updateState({ withdrawAmount: e.target.value })}
                      />
                      <button 
                        onClick={() => handleTransaction('requestWithdraw')}
                        className="w-full bg-blue-500 text-white rounded-lg px-4 py-2"
                      >
                        引き出しをリクエスト
                      </button>
                    </>
                  )}
                </div>
              )}

              <button 
                onClick={() => handleTransaction('claim')}
                className="w-full mt-4 border border-gray-300 rounded-lg px-4 py-2"
              >
                報酬を請求
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
