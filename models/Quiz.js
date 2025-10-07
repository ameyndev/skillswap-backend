const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  explanation: { type: String }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  skillName: { type: String, required: true }, // The skill this quiz tests
  questions: [quizQuestionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who the quiz is sent to
  skillRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillRequest' }, // Associated skill request
  status: {
    type: String,
    enum: ['draft', 'sent', 'completed'],
    default: 'draft'
  },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number, default: 0 }, // Score out of total questions
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Validate that there's exactly one correct answer per question
quizQuestionSchema.pre('save', function(next) {
  const correctAnswers = this.options.filter(option => option.isCorrect).length;
  if (correctAnswers !== 1) {
    return next(new Error('Each question must have exactly one correct answer'));
  }
  next();
});

// Validate that quiz has between 1 and 10 questions
quizSchema.pre('save', function(next) {
  if (this.questions.length < 1 || this.questions.length > 10) {
    return next(new Error('Quiz must have between 1 and 10 questions'));
  }
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);

