import { ritzzStatus } from "../components/Coins/ritzzCard";

test("Ritzz status follows the day thresholds", () => {
  expect(ritzzStatus(6)).toBeNull();
  expect(ritzzStatus(7).label).toBe("RARE");
  expect(ritzzStatus(14).label).toBe("RARE");
  expect(ritzzStatus(15).label).toBe("EPIC");
  expect(ritzzStatus(30).label).toBe("LEGENDARY");
  expect(ritzzStatus(365).label).toBe("MYTHIC");
});
