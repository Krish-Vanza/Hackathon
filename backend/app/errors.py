"""Domain errors that services raise and main.py maps to HTTP responses."""


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass
