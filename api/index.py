"""
Vercel Serverless Function entry point.
"""
import sys
import os

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
