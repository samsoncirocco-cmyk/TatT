"""
Setup file for execution scripts package.
"""

from setuptools import setup, find_packages

setup(
    name="pangyo-execution",
    version="0.1.0",
    packages=find_packages(include=["execution", "execution.*"]),
    install_requires=[
        "google-cloud-secret-manager>=2.20.0",
        "google-cloud-firestore>=2.16.0",
        "google-cloud-storage>=2.16.0",
        "neo4j>=5.20.0",
        "requests>=2.31.0",
    ],
    python_requires=">=3.9",
)
