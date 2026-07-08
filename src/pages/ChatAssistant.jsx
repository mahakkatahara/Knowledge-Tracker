import { useState, useRef, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, HelpCircle, Sparkles, Trash2 } from "lucide-react";
import useLocalStorage from "../hooks/useLocalStorage";
import { CHAT_BOT_ANSWERS, INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { getDaysElapsed, calculateRetention, getForgetRisk, getRevisionRecommendations } from "../utils/decayEngine";
import { AuthContext } from "../context/AuthContext";

const WELCOME =
  "Hey! 👋 I'm your Smart Revision Assistant. I can:\n" +
  "• Tell you what to revise today\n" +
  "• Break down any topic's memory & forget-risk\n" +
  "• Show your high/medium/low-risk topics & overall progress\n" +
  "• Find study material (YouTube / articles / Wikipedia) for any topic\n" +
  "• Explain how the decay model works, and give study tips\n\n" +
  "What would you like to know?";

// Words that are too generic to reliably identify a topic from a free-form
// question — ignored when deciding whether a query is *about* a tracked topic.
const GENERIC_CHAT_WORDS = new Set([
  "introduction", "overview", "summary", "chapter", "section", "notes", "note",
  "basics", "study", "revise", "revision", "topic", "topics", "concept",
  "concepts", "question", "questions", "part", "unit", "lesson",
]);

const ChatAssistant = () => {
  const { user } = useContext(AuthContext);
  const uid = user?.email || "guest";
  const [topics] = useLocalStorage(`kt_topics::${uid}`, INITIAL_TOPICS);
  const [messages, setMessages] = useLocalStorage(`chat-messages::${uid}`, [
    {
      id: "welcome",
      sender: "bot",
      text: WELCOME,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Grow the input box with the typed text (up to a cap), then let it scroll —
  // so long messages stay fully visible instead of overflowing a fixed box.
  const autoResize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  useEffect(() => {
    autoResize();
  }, [inputVal]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const linksFor = (subject) => {
    const s = subject.trim();
    const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(s + " tutorial lecture")}`;
    const goog = `https://www.google.com/search?safe=active&q=${encodeURIComponent(s + " explained tutorial")}`;
    const wiki = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(s)}`;
    return `${yt}\n${goog}\n${wiki}`;
  };

  const extractSubject = (qq) =>
    qq
      .replace(
        /\b(can you |please |explain|what is|what are|what's|tell me about|teach me|how do i learn|how to learn|how can i learn|i want to learn|study material for|resources for|define|describe|give me|about|learn)\b/gi,
        ""
      )
      .replace(/[?.!]/g, "")
      .trim();

  const generateDynamicResponse = (queryLower) => {
    const q = queryLower.trim();

    const annotated = topics.map((t) => {
      const retention = calculateRetention(t);
      const riskObj = getForgetRisk(retention);
      return {
        ...t,
        retention,
        risk: riskObj.category,
        riskScore: riskObj.score,
        days: getDaysElapsed(t.lastStudied),
      };
    });
    const hasTopics = annotated.length > 0;

    if (/^(hi|hii+|hey|hello|heya|yo|sup|namaste|hola)\b/.test(q) || q === "hi" || q === "hello") {
      return WELCOME;
    }

    if (q.includes("thank") || q.includes("shukriya")) {
      return "You're welcome! 😊 Keep hitting the high-risk topics first and your retention stays strong. Anything else?";
    }

    if (
      q.includes("who are you") || q.includes("what are you") || q.includes("what can you do") ||
      q.includes("your name") || q.includes("about you") || q.includes("what do you do") ||
      q.includes("your capabilities") || q.includes("help me with")
    ) {
      return (
        "I'm your **Smart Revision Assistant**, built into this tracker. I work off *your* topics and their forgetting curves, so I can:\n\n" +
        "• Tell you what to revise today (ranked by forget-risk)\n" +
        "• Break down any topic's memory retention & risk\n" +
        "• Summarise your overall progress and risk distribution\n" +
        "• Find study material (YouTube / articles / Wikipedia)\n" +
        "• Explain how the decay model works and share study tips\n\n" +
        "Try: 'What should I revise today?' or 'How am I doing overall?'"
      );
    }

    if (/^(ok(ay)?|k+|cool|nice|great|awesome|perfect|got it|understood|alright|bye|goodbye|see ya|gotcha)\b/.test(q)) {
      return "👍 Anytime! Ask me what to revise, about any topic, or how your risk is calculated whenever you're ready.";
    }

    if (
      q.includes("how to use") || q.includes("how do i use") || q.includes("guide") ||
      q.includes("navigate") || q.includes("how does this work") || q.includes("how this work") ||
      (q.includes("help") && !q.includes("revise") && !q.includes("study"))
    ) {
      return (
        "Here's how to use this platform:\n\n" +
        "1. **Study Tracker** — Add topics manually, or upload a PDF and the app auto-extracts the key topics. You enter your quiz score & confidence, and it computes the forget-risk.\n" +
        "2. **Dashboard** — Overall memory retention, risk distribution, study streak and what's coming up.\n" +
        "3. **Study material** — Every topic has YouTube / Articles / Wikipedia buttons for quick revision.\n" +
        "4. **Quiz** — Auto-generates MCQs from your tracked topics; the ones you fumble get pushed to High risk.\n" +
        "5. **This chat** — Ask what to revise, about any topic, or how risk is calculated.\n\n" +
        "Mark a topic as *revised* on the Tracker to reset its decay and boost retention!"
      );
    }

    if (
      q.includes("how is risk") || q.includes("how is forget") || q.includes("forgetting risk") ||
      q.includes("how is retention") || q.includes("formula") || q.includes("ebbinghaus") ||
      (q.includes("calculate") && (q.includes("risk") || q.includes("retention"))) ||
      (q.includes("how") && q.includes("decay"))
    ) {
      return (
        "Our **Knowledge Decay Engine** is based on the Ebbinghaus Forgetting Curve:\n\n" +
        "1. **Baseline memory** — from your quiz score (60% weight) + confidence (40% weight).\n" +
        "2. **Decay over time** — memory drops each day since you last studied; harder topics decay faster.\n" +
        "3. **Spaced-repetition boost** — every revision you log slows the decay, flattening the curve.\n" +
        "4. **Risk bands** — High: retention < 40% • Medium: 40–70% • Low: ≥ 70%."
      );
    }

    if (
      q.includes("tip") || q.includes("how to study") || q.includes("how should i study") ||
      q.includes("improve memory") || q.includes("memorize") || q.includes("technique") ||
      q.includes("advice") || q.includes("spaced repetition") || q.includes("study better")
    ) {
      return (
        "Some evidence-based study tips:\n\n" +
        "• **Spaced repetition** — revise right as you're about to forget (that's what this app's risk % is for). Don't cram.\n" +
        "• **Active recall** — test yourself instead of re-reading; your quiz score drives the model here.\n" +
        "• **Interleaving** — mix topics instead of one long block on a single topic.\n" +
        "• **Teach it out loud** — exposes gaps fast.\n" +
        "• **High-risk first** — ask me 'what should I revise today?' and I'll rank them."
      );
    }

    if (
      q.includes("recommend") || q.includes("what should i revise") || q.includes("what to revise") ||
      q.includes("what should i study") || q.includes("study plan") || q.includes("revision plan") ||
      q.includes("revision queue") || q.includes("what to study") || q.includes("priorit")
    ) {
      const recommendations = getRevisionRecommendations(topics);
      if (recommendations.length === 0) {
        return "You have no topics logged yet. Head to the **Study Tracker** (add manually or upload a PDF) and I'll build your revision plan!";
      }
      let reply = "Based on your forgetting curves, here are your top revision priorities:\n\n";
      recommendations.slice(0, 3).forEach((rec, i) => {
        reply += `${i + 1}. **${rec.title}**\n`;
        reply += `   • Memory Retention: ${rec.retentionVal}%\n`;
        reply += `   • Forget Risk: ${rec.risk} (${rec.riskScore}%)\n`;
        reply += `   • Last studied: ${rec.daysElapsed} days ago (Quiz ${rec.quizScore}%, Conf ${rec.confidenceScore}/5)\n\n`;
      });
      reply += "Mark any as revised on the **Study Tracker** to reset its decay.";
      return reply;
    }

    if (
      q.includes("how many topic") || q.includes("my topics") || q.includes("show topic") ||
      q.includes("all topic") || q.includes("what topics") || q.includes("list topic") ||
      (q.includes("list") && hasTopics)
    ) {
      if (!hasTopics) return "You have no topics yet. Add some on the Study Tracker (or upload a PDF) and I'll track them!";
      let r = `You have **${annotated.length} topic${annotated.length > 1 ? "s" : ""}** logged:\n\n`;
      annotated.forEach((t, i) => {
        r += `${i + 1}. ${t.title} — ${t.retention}% retention (${t.risk} risk)\n`;
      });
      return r;
    }

    if (
      q.includes("high risk") || q.includes("medium risk") || q.includes("low risk") ||
      q.includes("risk distribution") || q.includes("risk breakdown") || q.includes("at risk")
    ) {
      if (!hasTopics) return "No topics yet to analyse. Add some on the Study Tracker!";
      const cat = q.includes("high") ? "High" : q.includes("medium") ? "Medium" : q.includes("low") ? "Low" : null;
      if (cat) {
        const list = annotated.filter((t) => t.risk === cat);
        if (!list.length) return `Good news — no topics are at ${cat} risk right now! 🎉`;
        let r = `Topics at **${cat} risk** (${list.length}):\n\n`;
        list.forEach((t) => (r += `• ${t.title} — ${t.retention}% retention (${t.riskScore}% risk)\n`));
        return r;
      }
      const h = annotated.filter((t) => t.risk === "High").length;
      const m = annotated.filter((t) => t.risk === "Medium").length;
      const l = annotated.filter((t) => t.risk === "Low").length;
      return `Risk distribution across ${annotated.length} topics:\n\n🔴 High: ${h}\n🟠 Medium: ${m}\n🟢 Low: ${l}`;
    }

    if (
      q.includes("summary") || q.includes("overall") || q.includes("how am i doing") ||
      q.includes("my progress") || q.includes("my stats") || q.includes("average retention") ||
      q.includes("my retention") || q.includes("progress")
    ) {
      if (!hasTopics) return "Nothing to summarise yet — add your first topic on the Study Tracker!";
      const avg = Math.round(annotated.reduce((s, t) => s + t.retention, 0) / annotated.length);
      const high = annotated.filter((t) => t.risk === "High").length;
      return (
        "📊 Your overall study health:\n\n" +
        `• Topics tracked: **${annotated.length}**\n` +
        `• Average retention: **${avg}%**\n` +
        `• High-risk topics: **${high}**\n\n` +
        (high > 0 ? "Ask 'what should I revise today?' to tackle the high-risk ones first." : "You're in great shape — keep it up! 💪")
      );
    }

    if (
      q.includes("weakest") || q.includes("worst") || q.includes("most at risk") ||
      q.includes("forget first") || q.includes("strongest") || q.includes("best topic") || q.includes("best retained")
    ) {
      if (!hasTopics) return "No topics yet to compare. Add some on the Study Tracker!";
      const sorted = [...annotated].sort((a, b) => b.riskScore - a.riskScore);
      if (q.includes("strong") || q.includes("best")) {
        const t = sorted[sorted.length - 1];
        return `Your strongest topic is **${t.title}** — ${t.retention}% retention (${t.risk} risk). Nicely retained! ✅`;
      }
      const t = sorted[0];
      return (
        `Your weakest topic is **${t.title}** — only ${t.retention}% retention (${t.risk} risk, ${t.days} days since studied). Revise this first!\n\n` +
        `Study material:\n${linksFor(t.title)}`
      );
    }

    if (q.includes("due") || q.includes("upcoming") || q.includes("today") || q.includes("schedule") || q.includes("when should")) {
      const recs = getRevisionRecommendations(topics);
      if (!recs.length) return "Nothing urgent is due right now. 🎉 Add topics, or check back as memories decay over time.";
      let r = "Due for revision soon:\n\n";
      recs.slice(0, 5).forEach((rec, i) => (r += `${i + 1}. ${rec.title} — ${rec.risk} risk (${rec.retentionVal}% retention)\n`));
      return r;
    }

    const hasWord = (text, w) =>
      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

    // Prefer the most specific (longest) topic title the query actually mentions,
    // and match on whole words so "data" doesn't fire on "metadata".
    const matchedTopic = [...topics]
      .sort((a, b) => b.title.length - a.title.length)
      .find((t) => {
        const titleLower = t.title.toLowerCase();
        if (q.includes(titleLower)) return true;
        const words = titleLower.split(/[\s-]/).filter((w) => w.length > 3 && !GENERIC_CHAT_WORDS.has(w));
        return words.length > 0 && words.some((w) => hasWord(q, w));
      });

    if (matchedTopic) {
      const retention = calculateRetention(matchedTopic);
      const riskObj = getForgetRisk(retention);
      const daysElapsed = getDaysElapsed(matchedTopic.lastStudied);

      let e = `Here's your memory profile for **${matchedTopic.title}**:\n\n`;
      e += `• Memory Retention: **${retention}%**\n`;
      e += `• Forgetting Risk: **${riskObj.category}** (${riskObj.score}%)\n`;
      e += `• Last studied: ${daysElapsed} days ago (${matchedTopic.lastStudied})\n`;
      e += `• Revisions: ${matchedTopic.revisionCount} • Quiz: ${matchedTopic.quizScore}% • Conf: ${matchedTopic.confidenceScore}/5\n\n`;
      if (riskObj.category === "High") {
        e += `⚠️ **High Risk** — low memory strength and it's a ${matchedTopic.difficulty} topic, so it decays fast. Revise today!`;
      } else if (riskObj.category === "Medium") {
        e += `⏳ **Decaying** — recall is starting to fade after ${daysElapsed} days. A quick review will stabilise it.`;
      } else {
        e += `✅ **Well retained** — strong quiz score and revisions. No urgent need to revise.`;
      }
      e += `\n\nStudy material for ${matchedTopic.title}:\n${linksFor(matchedTopic.title)}`;
      return e;
    }

    if (
      q.includes("explain") || q.startsWith("what is") || q.startsWith("what are") || q.startsWith("what's") ||
      q.includes("tell me about") || q.includes("how do i learn") || q.includes("how to learn") ||
      q.includes("teach") || q.includes("resources") || q.includes("study material") || q.includes("define") ||
      q.startsWith("learn ")
    ) {
      const subject = extractSubject(q);
      if (subject && subject.length >= 2) {
        return (
          `I don't have "${subject}" in your tracker yet, but here's where to study it:\n\n${linksFor(subject)}\n\n` +
          "💡 Add it as a topic on the Study Tracker so I can track your retention & risk for it!"
        );
      }
    }

    const matchedStatic = CHAT_BOT_ANSWERS.find((item) => item.keywords.some((k) => q.includes(k)));
    if (matchedStatic) return matchedStatic.answer;

    const subject = extractSubject(q);
    if (subject && subject.length >= 3 && subject.split(/\s+/).length <= 6) {
      return (
        `I'm a study assistant, so I'm strongest on your topics & revision — but here's study material for "${subject}":\n\n` +
        `${linksFor(subject)}\n\n` +
        "You can also ask: 'What should I revise today?', 'Show my topics', or 'How is forget-risk calculated?'"
      );
    }

    return (
      "I can help with your study tracking! Try:\n" +
      "• 'What should I revise today?'\n" +
      "• 'Tell me about <your topic>'\n" +
      "• 'Show my high-risk topics'\n" +
      "• 'How is forgetting risk calculated?'\n" +
      "• 'Give me study tips'"
    );
  };

  const processQuery = (userText) => {
    const queryLower = userText.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTimeout(() => {
      const botText = generateDynamicResponse(queryLower);
      setMessages((prev) => [...prev, { id: `bot-${prev.length}`, sender: "bot", text: botText, timestamp }]);
    }, 500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageText = inputVal.trim();
    setMessages((prev) => [...prev, { id: `user-${prev.length}`, sender: "user", text: messageText, timestamp }]);
    setInputVal("");
    processQuery(messageText);
  };

  const handleSuggestionClick = (suggestionText) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: `user-${prev.length}`, sender: "user", text: suggestionText, timestamp }]);
    processQuery(suggestionText);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear chat history?")) {
      setMessages([
        { id: "welcome", sender: "bot", text: WELCOME, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }
  };

  const renderMessageText = (text) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => {
      if (/^https?:\/\//.test(part)) {
        let label = "Open link ↗";
        if (part.includes("youtube")) label = "▶️ YouTube ↗";
        else if (part.includes("google")) label = "🌐 Articles ↗";
        else if (part.includes("wikipedia")) label = "📖 Wikipedia ↗";
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="my-1 inline-flex w-fit rounded-lg border border-signal/30 bg-signal/10 px-2.5 py-1 text-xs font-medium text-signal transition hover:bg-signal/20">
            {label}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const suggestions = [
    "What should I revise today?",
    "Show my high-risk topics",
    "How am I doing overall?",
    "Give me study tips",
    "How is forgetting risk calculated?",
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Co-pilot</span>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Smart study assistant</h1>
          <p className="mt-2 max-w-xl text-muted">Ask about forgetting forecasts, revision plans, your topics, or study resources.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearHistory}>
          <Trash2 size={14} /> Clear history
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Chat */}
        <Card className="flex h-[64vh] min-h-[520px] flex-col p-0">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {messages.map((msg) => {
              const bot = msg.sender === "bot";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-end gap-2.5 ${bot ? "" : "flex-row-reverse"}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${bot ? "border-synapse/30 bg-synapse/15" : "border-retained/30 bg-retained/15"}`}>
                    {bot ? <Bot size={16} className="text-synapse-bright" /> : <User size={16} className="text-retained" />}
                  </span>
                  <div className={`max-w-[80%] min-w-0 rounded-2xl border px-4 py-3 ${bot ? "rounded-bl-sm border-line bg-surface-2" : "rounded-br-sm border-synapse/30 bg-synapse/[0.12]"}`}>
                    <p className="flex flex-col whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/95">{renderMessageText(msg.text)}</p>
                    <span className="mono mt-1.5 block text-[10px] text-faint">{msg.timestamp}</span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex items-end gap-2 border-t border-line bg-surface-2 p-3">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask a question…"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="max-h-40 min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-ink outline-none transition focus:border-synapse/60 focus:ring-2 focus:ring-synapse/25"
            />
            <button type="submit" title="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#10b981,#0d9488)] text-white transition hover:opacity-90 glow-synapse">
              <Send size={17} />
            </button>
          </form>
        </Card>

        {/* Suggestions */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Card title="Quick recommendations">
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
              <Sparkles size={13} className="text-synapse-bright" /> Tap a query for an instant answer:
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(sug)}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-left text-sm text-muted transition hover:border-synapse/40 hover:bg-synapse/[0.06] hover:text-ink"
                >
                  <HelpCircle size={15} className="shrink-0 text-faint" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
