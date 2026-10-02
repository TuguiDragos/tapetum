"""Small Python module for the lab."""
from dataclasses import dataclass, field


@dataclass
class Sensor:
    name: str
    readings: list[float] = field(default_factory=list)

    def mean(self) -> float:
        if not self.readings:
            return 0.0
        return sum(self.readings) / len(self.readings)


def summarize(sensors: list[Sensor]) -> dict[str, float]:
    # Map each sensor to its mean reading
    return {s.name: round(s.mean(), 2) for s in sensors}


if __name__ == "__main__":
    probe = Sensor("probe", [21.5, 22.0, 22.75])
    print(summarize([probe]))
