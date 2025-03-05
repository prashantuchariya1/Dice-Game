import DiceRollAnimation from "./components/diceRoll";
import diceStatic from "./assets/dice-static.png";
import { useState, useEffect } from "react";
import axios from "axios";
import CryptoJS from "crypto-js";
import Confetti from "react-confetti";

function App() {
  const [betAmount, setBetAmount] = useState(10);
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  const [balance, setBalance] = useState(0);
  const [lastRoll, setLastRoll] = useState(null);
  const [gameResult, setGameResult] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [selectedNumber, setSelectedNumber] = useState(0);
  const [gameCount, setGameCount] = useState(0);
  const [progress, setProgress] = useState("");
  const [fairnessExplanation, setFairnessExplanation] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  // New state for server connection status
  const [serverConnected, setServerConnected] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  console.log("Backend URL:", backendUrl);

  // Init balance
  useEffect(() => {
    fetchBalance();
  }, []);

  // Periodically check server connection (every 5 seconds)
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // Using the /balance endpoint as a connectivity check
        await axios.get(`${backendUrl}/balance`);
        setServerConnected(true);
      } catch (error) {
        setServerConnected(false);
      }
    };

    checkServerStatus();
    const intervalId = setInterval(checkServerStatus, 5000);
    return () => clearInterval(intervalId);
  }, [backendUrl]);

  // Alert the user when server disconnects
  useEffect(() => {
    if (!serverConnected) {
      alert("Server not connected. Wait for 50 sec.");
    }
  }, [serverConnected]);

  // Fetch balance
  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${backendUrl}/balance`);
      setBalance(response.data.balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      alert("Error fetching balance");
    }
  };

  // Generate seed
  function generateClientSeed() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Roll dice
  const rollDice = async () => {
    if (betAmount <= 0) {
      alert("Invalid bet amount!");
      return;
    }
    if (betAmount > balance) {
      alert("Bet amount cannot exceed balance!");
      return;
    }

    setProgress("Rolling the dice...");
    setFairnessExplanation("");
    setVerificationStatus("");
    setGameResult("");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const response = await axios.post(`${backendUrl}/roll-dice`, {
        betAmount,
        clientSeed,
      });

      const { roll, result, newBalance, previousServerSeed, nonce } =
        response.data;
      setLastRoll(roll);
      setBalance(newBalance);
      setGameCount((prev) => prev + 1);
      setSelectedNumber(roll);

      const winnerMessage = roll >= 4 && result ? "You win!" : "You lose!";

      if (roll >= 4 && result) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      setGameResult(`You rolled: ${roll} ${winnerMessage}`);
      const isFair = verifyFairness(previousServerSeed, clientSeed, nonce, roll);
      setVerificationStatus(isFair ? "✅ Fair Result" : "❌ Tampered Result");
      setFairnessExplanation("Fairness is verified using SHA256.");
      setProgress("");
    } catch (error) {
      console.error("Error rolling dice:", error);
      alert("Error occurred while rolling dice");
      setProgress("");
    }
  };

  // Verify roll
  const verifyFairness = (serverSeed, clientSeed, nonce, roll) => {
    const combinedSeed = serverSeed + clientSeed + nonce;
    const hash = CryptoJS.SHA256(combinedSeed).toString();
    const generatedRoll = (parseInt(hash.substring(0, 8), 16) % 6) + 1;
    return generatedRoll === roll;
  };

  // Update bet
  const handleBetAmountChange = (value) => {
    const newAmount = Number(value);
    if (newAmount > balance) {
      alert("Bet amount cannot exceed balance!");
      setBetAmount(balance);
    } else {
      setBetAmount(newAmount);
    }
  };

  // Add funds
  const handleAddBalance = async () => {
    try {
      const response = await axios.post(`${backendUrl}/add-balance`, {
        amount: 1000,
      });
      setBalance(response.data.balance);
    } catch (error) {
      console.error("Error adding balance:", error);
      alert("Error adding balance");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      {/* Navbar */}
      <nav className="w-full bg-gray-800 p-6 mb-6 shadow-lg border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
            Dice Game
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm text-gray-400">
            Balance: <span className="text-white font-semibold">${balance}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                serverConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            {serverConnected ? (
              <span className="text-green-500">Connected</span>
            ) : (
              <span className="text-yellow-500">
                Server not connected. Wait for 50 sec.
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          gravity={0.5}
        />
      )}

      <div className="w-full max-w-4xl p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-1/3 bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="mb-4">
              <label htmlFor="setBetAmount" className="block text-sm font-medium">
                Bet Amount
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id="setBetAmount"
                  type="number"
                  value={betAmount}
                  onChange={(e) => handleBetAmountChange(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
                />
                <button
                  onClick={() => handleBetAmountChange(balance / 2)}
                  className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                >
                  1/2
                </button>
                <button
                  onClick={() => handleBetAmountChange(balance)}
                  className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="profitOnWin" className="block text-sm font-medium">
                Profit on Win
              </label>
              <input
                id="profitOnWin"
                type="number"
                value={betAmount * 2}
                readOnly
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="accountBalance" className="block text-sm font-medium">
                Account Balance
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id="accountBalance"
                  type="text"
                  value={balance}
                  readOnly
                  className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
                />
                <button
                  onClick={handleAddBalance}
                  className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-500"
                >
                  Add Balance
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium">Games Played</label>
              <input
                type="text"
                value={gameCount}
                readOnly
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Main */}
          <div className="w-full md:w-2/3 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
            {progress === "Rolling the dice..." ? (
              <DiceRollAnimation currentRoll={lastRoll} />
            ) : (
              <img
                src={diceStatic}
                alt="Static Dice"
                className="w-48 h-48"
              />
            )}

            {gameResult && (
              <div className="mt-4 text-center">
                <p>{gameResult}</p>
                <p>{verificationStatus}</p>
                {fairnessExplanation && <p>{fairnessExplanation}</p>}
              </div>
            )}

            <div className="w-full mt-8 mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-500 font-semibold">Loss (1-3)</span>
                <span className="text-lg font-bold">{selectedNumber}</span>
                <span className="text-green-500 font-semibold">Win (4-6)</span>
              </div>
              <div className="relative">
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      lastRoll !== null
                        ? lastRoll >= 4
                          ? "bg-green-500"
                          : "bg-red-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${(selectedNumber / 6) * 100}%` }}
                  />
                </div>
                <div className="absolute top-0 w-full flex justify-between px-[1px] -mt-1">
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <div
                      key={number}
                      className={`h-5 w-0.5 ${
                        number < 4 ? "bg-red-500/50" : "bg-green-500/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute w-full flex justify-between -mt-1 px-[1px]">
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <span
                      key={number}
                      className={`text-xs -ml-1 mt-5 ${
                        number < 4 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {number}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={rollDice}
              className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-500 w-full"
            >
              Roll Dice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
