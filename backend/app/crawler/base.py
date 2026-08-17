from abc import ABC, abstractmethod


class Parser(ABC):
    @abstractmethod
    def parse(self, html: str, url: str) -> list[dict]:
        raise NotImplementedError("Subclasses must implement parse()")
