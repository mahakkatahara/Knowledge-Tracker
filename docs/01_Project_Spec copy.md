# Knowledge Decay Predictor & Smart Revision Assistant

## Project Overview

Knowledge Decay Predictor & Smart Revision Assistant is an educational web platform that helps students retain knowledge effectively through intelligent revision planning.

The system tracks study activity, predicts knowledge decay using machine learning, retrieves relevant learning resources using information retrieval techniques, and generates personalized revision schedules.

The goal is to improve long-term memory retention and reduce inefficient studying.

---

## Problem Statement

Students frequently forget concepts after studying because they do not revise consistently and lack personalized study guidance.

The platform should predict forgetting risk, identify weak topics, retrieve relevant learning material, and generate intelligent revision recommendations.

---

## Project Objectives

The system should:

1. Track student learning behavior.
2. Predict knowledge decay.
3. Identify high-risk topics.
4. Retrieve relevant revision material.
5. Generate personalized revision schedules.
6. Explain revision recommendations.
7. Improve long-term memory retention.

---

## System Architecture

Frontend (React + Vite)
↓
Backend API (FastAPI)
↓
SQLite Database
↓
Machine Learning Module
↓
Information Retrieval Module

---

## Technology Stack

### Frontend

* React
* Vite
* React Router
* CSS

### Backend

* FastAPI
* Python

### Database

* SQLite

### Machine Learning

* Scikit-Learn
* Random Forest Classifier
* Decision Tree Classifier

### Information Retrieval

* TF-IDF
* Inverted Index
* Cosine Similarity
* NLTK

### Visualization

* Plotly
* Matplotlib

---

## Phase 1 Scope (Current Development Phase)

### Landing Page

* Project Introduction
* Feature Highlights
* Call To Action
* Get Started Button

### Navigation

* Home
* Dashboard
* Study Tracker
* Notes
* Chat Assistant

### Dashboard

Display:

* Memory Retention Score
* Forget Risk Distribution
* Study Streak
* Weekly Study Hours
* High-Risk Topics
* Upcoming Revisions

### Study Tracker

Allow users to:

* Add Topics
* Record Study Duration
* Enter Confidence Score
* Enter Quiz Score
* Track Revision Count

### Notes Module

Allow users to:

* Upload Notes
* View Notes
* Search Notes
* Organize Notes

### Chat Assistant

Provide:

* Platform Guidance
* Revision Explanations
* Risk Explanations
* Navigation Help

---

## Information Retrieval Pipeline

1. Text Extraction
2. Tokenization
3. Stopword Removal
4. Lemmatization
5. TF-IDF Vectorization
6. Inverted Index Creation
7. Cosine Similarity Search
8. Document Ranking

Purpose:

Retrieve the most relevant study material for topics predicted as high-risk.

---

## Machine Learning Pipeline

Input Features:

* Days Since Last Study
* Study Duration
* Confidence Score
* Quiz Score
* Revision Count
* Topic Difficulty

Models:

* Decision Tree Classifier
* Random Forest Classifier

Outputs:

* Forget Risk Score
* Risk Category
* Revision Priority

Risk Categories:

* Low Risk
* Medium Risk
* High Risk

---

## Recommendation Engine

The recommendation engine should:

* Rank topics by risk
* Generate revision priorities
* Create revision schedules
* Recommend study materials

Example:

Today's Revision:

1. Dynamic Programming
2. Graph Algorithms
3. Binary Search

---

## Smart Study Assistant

The chatbot should:

* Explain risk predictions
* Explain revision recommendations
* Help users navigate the platform
* Help locate notes
* Explain study progress

Example:

User:
Why should I revise Graph Algorithms?

Assistant:
Because your confidence score is low, quiz performance is weak, and the topic has not been revised recently.

---

## Future Phases

### Phase 2

Backend Development

* FastAPI Setup
* SQLite Integration
* API Development
* Data Storage

### Phase 3

Information Retrieval Module

* TF-IDF
* Inverted Index
* Cosine Similarity
* Notes Retrieval

### Phase 4

Machine Learning Module

* Dataset Preparation
* Model Training
* Risk Prediction

### Phase 5

Recommendation Engine

* Revision Scheduler
* Topic Ranking
* Smart Recommendations

### Phase 6

Deployment

* Frontend Deployment
* Backend Deployment
* Production Configuration

---

## Non-Goals

The project will not include:

* Blockchain
* AR/VR
* Facial Recognition
* Voice Recognition
* Complex Deep Learning Models

The primary focus is Information Retrieval and Machine Learning fundamentals suitable for academic evaluation and internship projects.
