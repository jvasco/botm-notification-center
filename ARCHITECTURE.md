# Architecture and Design Choices
Will use this file to explain how the system is designed and why. This will elaborate on tradeoffs, assumptions, and decisions made throughout the development process.
## Project Overview:
The Book of the Month notification center is a backend service responsible for managing notification definitions, determining which specific members should receive notifications, and tracking notifications delivered to indicidual members.

This service supports three types of notification mechanisms:
1. 