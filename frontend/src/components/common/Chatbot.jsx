import { useState } from 'react';
import { chatbotService } from '../../services/api';

function Chatbot() {
  const [messages, setMessages] = useState([
    { text: "Bonjour! Je suis Assistant Vanille avec IA. Je peux vous aider avec des informations sur les producteurs, coopératives, parcelles et statistiques.", sender: 'bot', aiMode: true }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Ajoute le message utilisateur
    const userMessage = { text: input, sender: 'user' };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(input);
      const botMessage = { 
        text: response.data.response, 
        sender: 'bot',
        intent: response.data.intent,
        aiMode: response.data.ai_mode || false
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { 
        text: "Désolé, une erreur s'est produite.", 
        sender: 'bot',
        aiMode: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-dark text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-primary-yellow rounded-full mr-2 animate-pulse"></div>
          <h3 className="font-bold">Assistant Vanille</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-green-600 px-2 py-1 rounded-full">IA</span>
          <span className="text-xs text-gray-300">En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-primary-yellow text-dark'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{msg.text}</p>
              {msg.intent && (
                <span className="text-xs text-gray-500 mt-1 block">
                  [{msg.intent}]
                </span>
              )}
              {msg.aiMode && (
                <span className="text-xs text-blue-500 mt-1 block flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                  Réponse IA
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez-moi une question sur les producteurs, coopératives, statistiques..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary-yellow"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-yellow text-dark px-6 py-2 rounded font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

export default Chatbot;
